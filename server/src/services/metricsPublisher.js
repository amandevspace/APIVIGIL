const crypto = require("crypto");
const zlib = require("zlib");
const { redisClient } = require("../config/redis");

async function publishMetric(data) {
  if (!redisClient.isOpen) {
    return;
  }

  const jobId = crypto.randomUUID().replaceAll("-", "");
  const jobData = JSON.stringify(["worker.process_metrics", null, [data], {}]);
  const jobKey = `rq:job:${jobId}`;
  const queueKey = "rq:queue:metrics";
  const now = new Date().toISOString();

  const transaction = redisClient.multi();
  transaction.hSet(jobKey, {
    data: zlib.deflateSync(Buffer.from(jobData)),
    created_at: now,
    origin: "metrics",
    description: "worker.process_metrics",
    timeout: "180",
    status: "queued",
  });
  transaction.sAdd("rq:queues", queueKey);
  transaction.rPush(queueKey, jobId);
  await transaction.exec();

  return jobId;
}

module.exports = { publishMetric };