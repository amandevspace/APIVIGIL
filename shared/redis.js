const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (error) => console.error("[redis] error:", error.message));
redisClient.on("connect", () => console.log("[redis] connected"));

async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient;
}

module.exports = { redisClient, connectRedis };