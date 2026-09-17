const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      default: "system",
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high", "warning", "critical"],
      required: true,
      default: "info",
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    api_url: { type: String, index: true },
    type: { type: String },
    value: { type: Number },
    threshold: { type: Number },
    dedupeKey: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Alert", alertSchema);
