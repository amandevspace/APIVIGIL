const express = require("express");
const crypto = require("crypto");
const Metric = require("../models/Metric");
const { checkAlerts } = require("../services/alertService");

const router = express.Router();

router.post("/", async (req, res) => {
  const body = req.body || {};
  console.log(`[metrics-service] metric received: ${body.serviceName || "unknown-service"}`);
  if (body.api_url && (typeof body.status !== "number" || typeof body.latency !== "number")) return res.status(400).json({ error: "status and latency must be numbers" });
  const idempotencyKey = body.idempotencyKey || (body.requestId ? crypto.createHash("sha1").update(`${body.requestId}:${body.api_url}:${body.timestamp || ""}`).digest("hex") : undefined);
  try {
    if (idempotencyKey) {
      const existing = await Metric.findOne({ idempotencyKey });
      if (existing) return res.status(200).json(existing);
    }
    const metric = await Metric.create({ ...body, idempotencyKey, timestamp: body.timestamp || new Date() });
    console.log("[metrics-service] metric stored");
    void checkAlerts(metric).catch((error) => console.error("[metrics-service] alert check failed:", error.message));
    return res.status(201).json(metric);
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) return res.status(200).json(await Metric.findOne({ idempotencyKey }));
    return res.status(500).json({ error: "Failed to save metric" });
  }
});

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const filter = req.query.api ? { api_url: req.query.api } : {};
  return res.json(await Metric.find(filter).sort({ timestamp: -1 }).limit(limit));
});

module.exports = router;
