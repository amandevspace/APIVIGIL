let inFlight = 0;

function backpressure(req, res, next) {
  const limit = Number(process.env.BACKPRESSURE_MAX_IN_FLIGHT || 200);
  if (inFlight >= limit) {
    return res.status(503).json({ error: "Service is under heavy load, please retry shortly" });
  }

  inFlight += 1;
  let finished = false;
  const release = () => {
    if (finished) return;
    finished = true;
    inFlight = Math.max(0, inFlight - 1);
  };
  res.once("finish", release);
  res.once("close", release);
  return next();
}

module.exports = backpressure;