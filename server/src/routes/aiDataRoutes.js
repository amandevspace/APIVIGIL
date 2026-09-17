const express = require("express");
const {
  getMetricsHistory,
  getPredictions,
  getAlerts,
  getInsights,
} = require("../controllers/aiDataController");

const router = express.Router();

router.get("/metrics/history", getMetricsHistory);
router.get("/predictions", getPredictions);
router.get("/alerts", getAlerts);
router.get("/insights", getInsights);

module.exports = router;