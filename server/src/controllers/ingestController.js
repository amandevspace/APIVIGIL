const axios = require("axios");

const ingestMetrics = async (req, res) => {
  try {
    const response = await axios.post(`${process.env.METRICS_SERVICE_URL}/metrics`, req.body, {
      timeout: Number(process.env.METRICS_REQUEST_TIMEOUT_MS || 3000),
      headers: { "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("[ingestMetrics] metrics-service error:", error.message);
    return res.status(error.response?.status || 502).json({ success: false, message: "Metrics service unavailable" });
  }
};

module.exports = { ingestMetrics };
