require("dotenv").config();
const express = require("express");
const helmet = require("helmet");

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ status: "ok", service: "ai-service" }));
app.post("/analyze", (req, res) => {
  console.log("[ai-service] analyze request received");
  return res.json({ result: "ok", analyzed: true, requestId: req.get("x-request-id") || null });
});

const port = Number(process.env.AI_PORT || 5000);
app.listen(port, () => console.log(`[ai-service] listening on ${port}`));
