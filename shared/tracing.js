function createRequestTrace(requestId, fields = {}) {
  const startedAt = Date.now();
  return {
    requestId,
    fields,
    elapsedMs: () => Date.now() - startedAt,
  };
}

module.exports = { createRequestTrace };