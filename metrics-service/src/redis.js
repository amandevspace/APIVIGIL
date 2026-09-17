const sharedRedis = require("../../shared/redis");

async function connectRedis() {
  await sharedRedis.connectRedis();
  console.log("[metrics-service] shared Redis ready");
}

module.exports = { client: sharedRedis.redisClient, connectRedis };
