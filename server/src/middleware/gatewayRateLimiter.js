const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

module.exports = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.get("x-api-key") || ipKeyGenerator(req),
  message: { error: "Too many requests, please try again later" },
});