const axios = require("axios");

const integrationConfig = {
  apiKey: process.env.API_KEY || "",
  allowedMethods: (process.env.ALLOWED_METHODS || "GET,POST,PUT,PATCH,DELETE")
    .split(",")
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean),
  allowedDomains: (process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
  proxyTimeoutMs: Number(process.env.PROXY_TIMEOUT_MS || 10000),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 30000),
  monitorIntervalMs: Number(process.env.MONITOR_INTERVAL_MS || 60000),
  syntheticMonitorEnabled: process.env.SYNTHETIC_MONITOR_ENABLED === "true",
  alertLatencyThresholdMs: Number(process.env.ALERT_LATENCY_THRESHOLD_MS || 2000),
  alertErrorRateThreshold: Number(process.env.ALERT_ERROR_RATE_THRESHOLD || 0.2),
};

function forwardRequest({ url, method, headers, data }) {
  const startedAt = Date.now();

  return axios({
    url,
    method,
    headers,
    data,
    timeout: integrationConfig.proxyTimeoutMs,
    validateStatus: () => true,
    maxContentLength: 10 * 1024 * 1024,
  }).then((response) => ({
    status: response.status,
    data: response.data,
    headers: response.headers,
    latency: Date.now() - startedAt,
  }));
}

module.exports = { integrationConfig, forwardRequest };