const Metric = require("../models/Metric");

async function runHourlyRollup() {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [result] = await Metric.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: "$api_url", requests: { $sum: 1 }, avgLatency: { $avg: "$latency" }, errors: { $sum: { $cond: [{ $gte: ["$status", 500] }, 1, 0] } } } },
  ]);
  console.log(`[metrics-service] hourly rollup complete (${result ? result.requests : 0} sampled requests)`);
}

function startRollupWorker() {
  const intervalMs = Number(process.env.ROLLUP_INTERVAL_MS || 3600000);
  void runHourlyRollup().catch((error) => console.error("[metrics-service] rollup failed:", error.message));
  return setInterval(() => void runHourlyRollup().catch((error) => console.error("[metrics-service] rollup failed:", error.message)), intervalMs);
}

module.exports = { startRollupWorker };
