const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema({
  serviceName: { type: String, default: "unknown-service", index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  api_url: { type: String, index: true },
  method: { type: String, uppercase: true },
  status: Number,
  latency: { type: Number, min: 0 },
  error: String,
  requestId: String,
  idempotencyKey: { type: String, unique: true, sparse: true },
  timestamp: { type: Date, default: Date.now, index: true },
  instanceId: String,
  healthStatus: String,
  tags: mongoose.Schema.Types.Mixed,
  cpu: mongoose.Schema.Types.Mixed,
  memory: mongoose.Schema.Types.Mixed,
  disk: mongoose.Schema.Types.Mixed,
  network: mongoose.Schema.Types.Mixed,
  requests: mongoose.Schema.Types.Mixed,
}, { timestamps: true, strict: false });

module.exports = mongoose.model("MetricsServiceMetric", metricSchema, "metrics");
