const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    predictedLatency: { type: Number, required: true },
    timestamp: { type: Date, required: true, index: true },
  },
  { collection: "predictions", strict: false }
);

module.exports = mongoose.model("Prediction", predictionSchema);