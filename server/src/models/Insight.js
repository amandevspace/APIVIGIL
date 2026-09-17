const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    rootCause: String,
    suggestedFix: String,
    anomalyData: mongoose.Schema.Types.Mixed,
    retrievedLogs: [mongoose.Schema.Types.Mixed],
    timestamp: { type: Date, index: true },
  },
  { collection: "insights", strict: false }
);

module.exports = mongoose.model("Insight", insightSchema);