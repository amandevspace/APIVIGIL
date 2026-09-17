const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    api_url: { type: String, trim: true, index: true },
    method: { type: String, uppercase: true, trim: true },
    status: { type: Number },
    latency: { type: Number, min: 0 },
    error: { type: String },
    requestId: { type: String, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    serviceName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    instanceId: {
      type: String,
      default: "default",
      index: true,
      trim: true,
    },
    healthStatus: {
      type: String,
      enum: ["healthy", "warning", "critical", "unknown"],
      default: "unknown",
      index: true,
    },
    tags: {
      type: Map,
      of: String,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    cpu: {
      usagePercent: {
        type: Number,
        default: 0,
        min: 0,
      },
      loadAverage: {
        type: Number,
        default: 0,
        min: 0,
      },
      cores: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    memory: {
      usedMb: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalMb: {
        type: Number,
        default: 0,
        min: 0,
      },
      usagePercent: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    disk: {
      usedMb: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalMb: {
        type: Number,
        default: 0,
        min: 0,
      },
      usagePercent: {
        type: Number,
        default: 0,
        min: 0,
      },
      readBytesPerSec: {
        type: Number,
        default: 0,
        min: 0,
      },
      writeBytesPerSec: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    network: {
      inboundBytesPerSec: {
        type: Number,
        default: 0,
        min: 0,
      },
      outboundBytesPerSec: {
        type: Number,
        default: 0,
        min: 0,
      },
      activeConnections: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    requests: {
      endpoint: {
        type: String,
        default: "",
        trim: true,
      },
      method: {
        type: String,
        default: "GET",
        uppercase: true,
        trim: true,
      },
      statusCode: {
        type: Number,
        default: 200,
        min: 100,
      },
      responseTimeMs: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        default: 1,
        min: 0,
      },
      success: {
        type: Boolean,
        default: true,
      },
      errorCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

metricSchema.index({ serviceName: 1, timestamp: -1 });
metricSchema.index({ serviceName: 1, healthStatus: 1, timestamp: -1 });
metricSchema.index({ instanceId: 1, timestamp: -1 });
metricSchema.index({ "requests.endpoint": 1, timestamp: -1 });
metricSchema.index({ "requests.statusCode": 1, timestamp: -1 });

module.exports = mongoose.model("Metric", metricSchema);
