const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  url: { type: String, required: true },
  type: { type: String, enum: ["proxy", "synthetic"], default: "synthetic" },
  intervalMs: { type: Number, default: 60000 },
}, { timestamps: true });

module.exports = mongoose.model("MetricsServiceApi", apiSchema, "apis");
