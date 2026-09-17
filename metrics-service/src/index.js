require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDb = require("./db");
const { connectRedis } = require("./redis");
const metricsRoutes = require("./routes/metrics");
const { startRollupWorker } = require("./services/rollupService");
const { startSyntheticMonitor } = require("./syntheticMonitor");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (expected && req.path === "/metrics" && req.method === "POST" && req.get("x-internal-service-token") !== expected) {
    return res.status(401).json({ error: "Invalid internal service token" });
  }
  return next();
});
app.get("/health", (req, res) => res.json({ status: "ok", service: "metrics-service" }));
app.use("/metrics", metricsRoutes);

const port = Number(process.env.METRICS_PORT || 4001);
connectDb().then(() => {
  void connectRedis().catch((error) => {
    console.warn(`[metrics-service] Redis unavailable; HTTP metrics remain active: ${error.message}`);
  });
  startRollupWorker();
  startSyntheticMonitor();
  app.listen(port, () => console.log(`[metrics-service] listening on ${port}`));
}).catch((error) => {
  console.error("[metrics-service] startup failed:", error.message);
  process.exitCode = 1;
});
