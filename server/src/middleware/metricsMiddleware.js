const axios = require("axios");
const { publishMetric } = require("../services/metricsPublisher");

const metricsMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  res.once("finish", () => {
    const latency = Date.now() - startedAt;
    const metric = {
      serviceName: "backend-server",
      api_url: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      latency,
      timestamp: new Date(),
      requests: {
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: latency,
        success: res.statusCode < 400,
        errorCount: res.statusCode >= 400 ? 1 : 0,
      },
    };

    void publishMetric(metric).catch((error) => console.error("Failed to publish metric stream event:", error.message));

    void axios.post(`${process.env.METRICS_SERVICE_URL}/metrics`, metric, {
      timeout: Number(process.env.METRICS_REQUEST_TIMEOUT_MS || 3000),
      headers: { "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
    }).catch((error) => console.error("Failed to publish request metric:", error.message));
  });
  return next();
};

module.exports = metricsMiddleware;
