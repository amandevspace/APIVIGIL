const cache = new Map();

function proxyCache(req, res, next) {
  const method = String(req.body?.method || "GET").toUpperCase();
  if (method !== "GET") return next();

  const key = `${req.userId}:${method}:${req.body.url}`;
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    res.set("x-apivigil-cache", "HIT");
    return res.status(entry.status).send(entry.data);
  }

  cache.delete(key);
  req.proxyCacheKey = key;
  res.set("x-apivigil-cache", "MISS");
  return next();
}

function setProxyCache(key, value) {
  if (key) {
    cache.set(key, {
      ...value,
      expiresAt: Date.now() + Number(process.env.CACHE_TTL_MS || 30000),
    });
  }
}

module.exports = { proxyCache, setProxyCache };