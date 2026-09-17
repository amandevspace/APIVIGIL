const axios = require("axios");

const sendMetric = async (payload) => {
  return axios.post(`${process.env.METRICS_SERVICE_URL}/metrics`, payload, {
    timeout: Number(process.env.METRICS_REQUEST_TIMEOUT_MS || 3000),
    headers: { "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
  });
};

module.exports = {
  sendMetric,
};
