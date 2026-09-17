const jwt = require("jsonwebtoken");

function gatewayAuth(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (apiKey && req.get("x-api-key") === apiKey) {
    req.userId = "service-account";
    return next();
  }

  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || "secretkey");
    req.userId = payload.id || payload.userId;
    if (!req.userId) return res.status(401).json({ error: "Invalid token" });
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = gatewayAuth;