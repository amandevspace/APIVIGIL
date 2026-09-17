const dotenv = require("dotenv");
dotenv.config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const app = require("./app");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

// 🔥 NEW IMPORTS
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

// 🔥 ENV setup
// 🔥 DB connect
connectDB();
// 🔥 Create HTTP server
const server = http.createServer(app);

// 🔥 Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 Socket connection log
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// 🔥 Express app me io inject karo
app.set("io", io);

// 🔥 AUTO REAL-TIME ENGINE (MOST IMPORTANT)
setInterval(() => {
  const io = app.get("io");
  if (!io) return;

  const totalMemory = os.totalmem() / 1024 / 1024 / 1024;
  const freeMemory = os.freemem() / 1024 / 1024 / 1024;
  const usedMemory = totalMemory - freeMemory;
  const cpuLoad = os.loadavg()[0];

  // 🔥 Alerts logic
  const alerts = [];

  if (freeMemory < 2) {
    alerts.push({
      type: "warning",
      message: "Low memory detected ⚠",
    });
  }

  if (cpuLoad > 2) {
    alerts.push({
      type: "critical",
      message: "High CPU load detected 🚨",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "healthy",
      message: "System running smoothly ✅",
    });
  }

  // 🔥 Prediction logic
  let risk = "low";
  let message = "System stable";

  if (cpuLoad > 2.5) {
    risk = "high";
    message = "CPU spike detected 🚨";
  } else if (cpuLoad > 1.5) {
    risk = "medium";
    message = "CPU load increasing ⚠";
  }

  if (usedMemory / totalMemory > 0.85) {
    risk = "high";
    message = "Memory usage critical 🚨";
  }

  const predictions = [
    {
      risk,
      message,
      cpu: cpuLoad.toFixed(2),
      memory: usedMemory.toFixed(2),
    },
  ];

  // 🔥 EMIT (REAL-TIME PUSH)
  io.emit("alerts", alerts);
  io.emit("predictions", predictions);
  io.emit("analytics-update");

}, 5000); // every 5 seconds

// 🔥 Port
const PORT = process.env.PORT || 5000;

// 🔥 Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  await connectRedis();
});