const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ["proxy", "synthetic"], default: "synthetic" },
    intervalMs: { type: Number, default: 60000, min: 15000 },
  },
  { timestamps: true }
);

apiSchema.index({ userId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model("Api", apiSchema);