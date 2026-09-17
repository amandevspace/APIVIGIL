const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// 🔥 ROUTES
const metricsMiddleware = require("./middleware/metricsMiddleware");
const metricsRoutes = require("./routes/metricsRoutes");
const healthRoutes = require("./routes/healthRoutes");
const systemRoutes = require("./routes/systemRoutes");
const alertRoutes = require("./routes/alertRoutes");
const logRoutes = require("./routes/logRoutes");
const failureRoutes = require("./routes/failureRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const emailRoutes = require("./routes/emailRoutes");
const ingestRoutes = require("./routes/ingestRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const rootCauseRoutes = require("./routes/rootCauseRoutes");
const chaosRoutes = require("./routes/chaosRoutes");
const aggregationRoutes = require("./routes/aggregationRoutes");
const deepAnalysisRoutes = require("./routes/deepanalysisRoutes");
const apiRoutes = require("./routes/apiRoutes");
const proxyRoutes = require("./routes/proxy");




const app = express();

// 🔥 MIDDLEWARES
app.use(express.json());

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// 🔥 RATE LIMIT (for ingestion API)
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 requests
  message: {
    success: false,
    message: "Too many requests, slow down",
  },
});

// 🔥 Apply middleware
app.use(metricsMiddleware);

// 🔥 Apply limiter BEFORE route
app.use("/api/ingest", ingestLimiter);

// 🔥 ROUTES
app.use("/api/metrics", metricsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/failures", failureRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/auth", require("./routes/auth"));
app.use("/api/auth", authRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/pdf-report", pdfRoutes);
app.use("/api/send-alert-email", emailRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/root-cause", rootCauseRoutes);
app.use("/api/chaos", chaosRoutes);
app.use("/api/aggregation", aggregationRoutes);
app.use("/api/deep-analysis", deepAnalysisRoutes);
app.use("/api/apis", apiRoutes);
app.use("/proxy", require("./routes/proxy"));
app.use("/api/proxy", proxyRoutes);
// 🔥 TEST ROUTES
// 🔥 Serve React Frontend
app.use(express.static(path.join(__dirname, "../../client/dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

module.exports = app;
