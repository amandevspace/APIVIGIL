const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const gatewayAuth = require("../middleware/gatewayAuth");
const backpressure = require("../middleware/backpressure");
const gatewayRateLimiter = require("../middleware/gatewayRateLimiter");
const validateProxyRequest = require("../middleware/validateProxyRequest");
const { proxyCache, setProxyCache } = require("../middleware/proxyCache");
const { forwardRequest } = require("../config/integration");

const router = express.Router();
const failures = new Map();

function isCircuitOpen(hostname) {
  const entry = failures.get(hostname);
  return entry && entry.count >= Number(process.env.CB_FAILURE_THRESHOLD || 5) && entry.until > Date.now();
}

function recordFailure(hostname) {
  const entry = failures.get(hostname) || { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= Number(process.env.CB_FAILURE_THRESHOLD || 5)) entry.until = Date.now() + Number(process.env.CB_COOLDOWN_MS || 30000);
  failures.set(hostname, entry);
}

function sendMetric(data) {
  console.log(`[proxy] sending metric for ${data.method} ${data.api_url}`);
  return axios.post(`${process.env.METRICS_SERVICE_URL}/metrics`, {
    ...data,
    serviceName: "api-gateway",
    requests: {
      endpoint: data.api_url,
      method: data.method,
      statusCode: data.status,
      responseTimeMs: data.latency,
      success: data.status < 500,
      errorCount: data.status >= 500 ? 1 : 0,
    },
  }, {
    timeout: Number(process.env.METRICS_REQUEST_TIMEOUT_MS || 3000),
    headers: { "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
  }).then(() => console.log("[proxy] metric sent to metrics-service")).catch((error) => console.error("Failed to send metric to metrics-service:", error.message));
}

async function requestAiAnalysis(payload) {
  if (process.env.AI_ENABLED !== "true") return null;
  console.log("[proxy] calling AI service /analyze");
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}${process.env.AI_ANALYZE_PATH || "/analyze"}`, payload, {
      timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS || 5000),
      headers: { "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
    });
    console.log("[proxy] AI analysis received");
    return response.data;
  } catch (error) {
    console.error("AI service unavailable:", error.message);
    return null;
  }
}

router.post("/", validateProxyRequest, gatewayAuth, gatewayRateLimiter, backpressure, proxyCache, async (req, res) => {
  const { url, method, headers = {}, body } = req.body;
  const hostname = new URL(url).hostname;
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  console.log(`[proxy] hit ${method} ${url}`);

  if (isCircuitOpen(hostname)) return res.status(503).json({ error: `Target ${hostname} is temporarily unavailable` });

  try {
    const result = await forwardRequest({ url, method, headers, data: body });
    failures.delete(hostname);
    void sendMetric({ userId: req.userId, api_url: url, method, status: result.status, latency: result.latency, timestamp: new Date(), requestId });
    if (req.proxyCacheKey && result.status < 400) setProxyCache(req.proxyCacheKey, { status: result.status, data: result.data });
    const ai = await requestAiAnalysis({ url, method, status: result.status, latency: result.latency, response: result.data });
    res.set("x-request-id", requestId);
    return res.status(result.status).send(ai ? { data: result.data, ai } : result.data);
  } catch (error) {
    recordFailure(hostname);
    void sendMetric({ userId: req.userId, api_url: url, method, status: 502, latency: Date.now() - startedAt, error: error.message, timestamp: new Date(), requestId });
    return res.status(error.code === "ECONNABORTED" ? 504 : 502).json({ error: "Proxy request failed", requestId });
  }
});

module.exports = router;
