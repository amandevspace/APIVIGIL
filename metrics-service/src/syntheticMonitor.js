const axios = require("axios");
const Api = require("./models/Api");
const Metric = require("./models/Metric");

async function check(api) {
  const started = Date.now();
  let status = 0;
  let error;
  try {
    const response = await axios.get(api.url, { timeout: Number(process.env.PROXY_TIMEOUT_MS || 10000), validateStatus: () => true });
    status = response.status;
  } catch (requestError) {
    error = requestError.message;
  }
  const latency = Date.now() - started;
  await Metric.create({ serviceName: "synthetic-monitor", userId: api.userId, api_url: api.url, method: "GET", status, latency, error, timestamp: new Date(), requests: { endpoint: api.url, method: "GET", statusCode: status, responseTimeMs: latency, success: status >= 200 && status < 500, errorCount: status >= 500 || status === 0 ? 1 : 0 } });
}

function startSyntheticMonitor() {
  if (process.env.SYNTHETIC_MONITOR_ENABLED !== "true") {
    console.log("[metrics-service] synthetic monitor disabled");
    return null;
  }
  const intervalMs = Number(process.env.MONITOR_INTERVAL_MS || 60000);
  const run = async () => {
    const apis = await Api.find({ type: "synthetic" }).lean();
    await Promise.allSettled(apis.map(check));
    console.log(`[metrics-service] synthetic monitor checked ${apis.length} APIs`);
  };
  void run().catch((error) => console.error("[metrics-service] synthetic monitor failed:", error.message));
  return setInterval(() => void run().catch((error) => console.error("[metrics-service] synthetic monitor failed:", error.message)), intervalMs);
}

module.exports = { startSyntheticMonitor };
