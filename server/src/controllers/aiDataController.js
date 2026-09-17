const Metric = require("../models/Metric");
const Prediction = require("../models/Prediction");
const Alert = require("../models/Alert");
const Insight = require("../models/Insight");

function limitFromRequest(req) {
  return Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
}

async function sendCollection(res, Model, limit) {
  const data = await Model.find().sort({ timestamp: -1 }).limit(limit).lean();
  return res.status(200).json({ success: true, count: data.length, data });
}

const getMetricsHistory = async (req, res) => {
  try {
    return await sendCollection(res, Metric, limitFromRequest(req));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPredictions = async (req, res) => {
  try {
    return await sendCollection(res, Prediction, limitFromRequest(req));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAlerts = async (req, res) => {
  try {
    return await sendCollection(res, Alert, limitFromRequest(req));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getInsights = async (req, res) => {
  try {
    return await sendCollection(res, Insight, limitFromRequest(req));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMetricsHistory, getPredictions, getAlerts, getInsights };