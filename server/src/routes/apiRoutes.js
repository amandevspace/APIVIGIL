const express = require("express");
const Api = require("../models/Api");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", protect, async (req, res) => {
  const { url, type = "synthetic", intervalMs = 60000 } = req.body || {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url is required" });
  if (!["proxy", "synthetic"].includes(type)) return res.status(400).json({ error: "type must be proxy or synthetic" });

  try {
    const api = await Api.create({
      userId: req.user,
      url,
      type,
      intervalMs: Math.max(Number.parseInt(intervalMs, 10) || 60000, 15000),
    });
    return res.status(201).json(api);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "This API is already registered for your account" });
    return res.status(500).json({ error: "API registration failed" });
  }
});

router.get("/list", protect, async (req, res) => {
  try {
    return res.json(await Api.find({ userId: req.user }).sort({ createdAt: -1 }));
  } catch (error) {
    return res.status(500).json({ error: "Failed to list APIs" });
  }
});

module.exports = router;