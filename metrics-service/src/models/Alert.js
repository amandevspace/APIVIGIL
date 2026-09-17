const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  api_url: { type: String, index: true },
  type: String,
  severity: String,
  message: { type: String, required: true },
  value: Number,
  threshold: Number,
  dedupeKey: { type: String, index: true },
}, { timestamps: true });

module.exports = mongoose.model("MetricsServiceAlert", alertSchema, "alerts");
