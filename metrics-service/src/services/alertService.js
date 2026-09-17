const Metric = require("../models/Metric");
const Alert = require("../models/Alert");

async function raise(fields) {
  const since = new Date(Date.now() - Number(process.env.ALERT_COOLDOWN_MS || 600000));
  if (await Alert.findOne({ dedupeKey: fields.dedupeKey, createdAt: { $gte: since } })) return;
  const alert = await Alert.create(fields);
  console.warn(`[metrics-service] alert ${alert.severity}: ${alert.message}`);
}

async function checkAlerts(metric) {
  const latencyThreshold = Number(process.env.ALERT_LATENCY_THRESHOLD_MS || 2000);
  if (metric.latency > latencyThreshold) {
    await raise({ dedupeKey: `latency:${metric.api_url}`, api_url: metric.api_url, userId: metric.userId, type: "latency", severity: metric.latency >= latencyThreshold * 3 ? "high" : "medium", message: `High latency: ${metric.api_url} took ${metric.latency}ms`, value: metric.latency, threshold: latencyThreshold });
  }

  const recent = await Metric.find({ api_url: metric.api_url, timestamp: { $gte: new Date(Date.now() - 300000) } }).select("status").lean();
  const threshold = Number(process.env.ALERT_ERROR_RATE_THRESHOLD || 0.2);
  if (recent.length >= 5) {
    const rate = recent.filter((item) => item.status === 0 || item.status >= 500).length / recent.length;
    if (rate > threshold) await raise({ dedupeKey: `error-rate:${metric.api_url}`, api_url: metric.api_url, userId: metric.userId, type: "error_rate", severity: rate >= threshold * 3 ? "high" : "medium", message: `High error rate for ${metric.api_url}`, value: rate, threshold });
  }
}

module.exports = { checkAlerts };
