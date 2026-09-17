// import axios from "axios";

// const getResponseTime = async () => {
//   const start = performance.now();
//   let statusCode;

//   try {
//     const res = await fetch(`${import.meta.env.VITE_API_URL}/test`);
//     statusCode = res.status;
//   } catch {
//     statusCode = 500;
//   }

//   const end = performance.now();

//   return {
//     responseTime: end - start,
//     statusCode,
//   };
// };

// export const sendMetrics = async (
//   serviceName = "frontend-app",
//   endpoint = "/test",
//   method = "GET"
// ) => {
//   try {
//     const { responseTime, statusCode } = await getResponseTime();

//     // 🔥 Memory (approx browser)
//     const memory =
//       performance?.memory?.usedJSHeapSize / 1024 / 1024 || Math.random() * 100;

//     // 🔥 CPU (approx fallback)
//     const cpu = Math.random() * 2;

//     await axios.post(`${import.meta.env.VITE_API_URL}/api/ingest`, {
//       serviceName,
//       endpoint,
//       method,
//       statusCode,
//       responseTime,
//       cpuUsage: cpu,
//       memoryUsage: memory,
//       success: statusCode < 400,
//     });

//   } catch (err) {
//     console.error("Metrics send failed", err);
//   }
// };




/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         ObserveAI Metrics SDK  v2.0                         ║
 * ║  Auto request tracking · Latency · Error capture            ║
 * ║  Batching · Retry · Async · Health scoring                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage (in your React app or any JS service):
 *
 *   import { ObserveAI } from './sdk/metrics';
 *
 *   const sdk = new ObserveAI({ serviceName: 'payment-service' });
 *   sdk.start();                            // auto-tracks all fetch/XHR
 *   sdk.trackRequest({ endpoint, method, statusCode, responseTimeMs });
 *   sdk.trackError(error, { endpoint });    // capture errors
 *   sdk.trackCustomMetric('cart_size', 5);
 *   sdk.stop();                             // cleanup on unmount
 */

// ─── Config Defaults ──────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  backendUrl:     `${import.meta.env.VITE_API_URL}/api/ingest`,
  batchSize:      10,
  flushInterval:  5000,
  retryAttempts:  3,
  retryDelay:     1000,
  maxQueueSize:   200,
  healthInterval: 30000,
  enabled:        true,
  debug:          false,
};

// ─── Health Scoring ───────────────────────────────────────────────────────────
function computeHealthScore({ errorRate = 0, avgLatency = 0, cpuUsage = 0, memoryMb = 0 }) {
  let score = 100;
  if (errorRate > 0)     score -= Math.min(50, errorRate * 5);
  if (avgLatency > 200)  score -= Math.min(25, (avgLatency - 200) / 20);
  if (cpuUsage > 1)      score -= Math.min(15, (cpuUsage - 1) * 10);
  if (memoryMb > 500)    score -= Math.min(10, (memoryMb - 500) / 100);
  return Math.max(0, Math.round(score));
}

function toHealthStatus(score) {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

// ─── Timing ───────────────────────────────────────────────────────────────────
function startTimer() {
  const t = performance.now();
  return () => Math.round(performance.now() - t);
}

function getMemoryMB() {
  if (performance?.memory?.usedJSHeapSize)
    return Math.round(performance.memory.usedJSHeapSize / 1048576);
  return Math.round(50 + Math.random() * 50);
}

async function estimateCPULoad() {
  return new Promise(resolve => {
    const t = performance.now();
    let n = 0;
    while (performance.now() - t < 5) n++;
    resolve(parseFloat(Math.max(0, Math.min(4, 4 - n / 5000)).toFixed(2)));
  });
}

// ─── Retry ────────────────────────────────────────────────────────────────────
async function withRetry(fn, attempts, baseDelay) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
}

// ─── Fetch Interceptor ────────────────────────────────────────────────────────
class FetchInterceptor {
  constructor(cb) { this.cb = cb; this._orig = null; }

  install() {
    this._orig = window.fetch;
    const cb = this.cb, orig = this._orig;
    window.fetch = async function(input, init = {}) {
      const url    = typeof input === 'string' ? input : (input?.url || '');
      const method = (init.method || 'GET').toUpperCase();
      const elapsed = startTimer();
      try {
        const res = await orig.call(this, input, init);
        const ms  = elapsed();
        if (!url.includes('/api/ingest')) {
          cb({ endpoint: _pathname(url), method, statusCode: res.status,
               responseTimeMs: ms, success: res.ok, errorCount: res.ok ? 0 : 1 });
        }
        return res;
      } catch (err) {
        if (!url.includes('/api/ingest'))
          cb({ endpoint: _pathname(url), method, statusCode: 0,
               responseTimeMs: elapsed(), success: false, errorCount: 1 });
        throw err;
      }
    };
  }

  uninstall() { if (this._orig) { window.fetch = this._orig; this._orig = null; } }
}

// ─── XHR Interceptor ──────────────────────────────────────────────────────────
class XHRInterceptor {
  constructor(cb) { this.cb = cb; this._open = null; this._send = null; }

  install() {
    const cb = this.cb;
    this._open = XMLHttpRequest.prototype.open;
    this._send = XMLHttpRequest.prototype.send;
    const origOpen = this._open, origSend = this._send;

    XMLHttpRequest.prototype.open = function(m, u, ...a) {
      this.__sdkM = m; this.__sdkU = u;
      return origOpen.call(this, m, u, ...a);
    };
    XMLHttpRequest.prototype.send = function(body) {
      const elapsed = startTimer();
      this.addEventListener('loadend', function() {
        const url = this.__sdkU || '';
        if (!url.includes('/api/ingest')) {
          cb({ endpoint: _pathname(url), method: (this.__sdkM || 'GET').toUpperCase(),
               statusCode: this.status, responseTimeMs: elapsed(),
               success: this.status >= 200 && this.status < 400,
               errorCount: this.status >= 400 ? 1 : 0 });
        }
      });
      return origSend.call(this, body);
    };
  }

  uninstall() {
    if (this._open) XMLHttpRequest.prototype.open = this._open;
    if (this._send) XMLHttpRequest.prototype.send = this._send;
  }
}

// ─── Error Interceptor ────────────────────────────────────────────────────────
class ErrorInterceptor {
  constructor(cb) { this.cb = cb; this._err = null; this._rej = null; }

  install() {
    this._err = e => this.cb({ message: e.message || 'Unknown error',
      source: e.filename || '', stack: e.error?.stack || '', type: 'uncaught' });
    this._rej = e => this.cb({ message: e.reason?.message || String(e.reason) || 'Unhandled rejection',
      stack: e.reason?.stack || '', type: 'unhandled_rejection' });
    window.addEventListener('error', this._err);
    window.addEventListener('unhandledrejection', this._rej);
  }
  uninstall() {
    if (this._err) window.removeEventListener('error', this._err);
    if (this._rej) window.removeEventListener('unhandledrejection', this._rej);
  }
}

function _pathname(url) {
  try { return new URL(url, window.location.href).pathname; } catch { return url; }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SDK CLASS
// ══════════════════════════════════════════════════════════════════════════════
export class ObserveAI {
  constructor(opts = {}) {
    this.config      = { ...DEFAULT_CONFIG, ...opts };
    this.serviceName = opts.serviceName || 'frontend-app';
    this._queue      = [];
    this._flushTimer = null;
    this._healthTimer= null;
    this._running    = false;
    this._instanceId = null;
    this._stats      = { sent:0, failed:0, dropped:0, totalRequests:0, totalErrors:0, totalLatency:0 };
    this._fetchIc    = new FetchInterceptor(this._onReq.bind(this));
    this._xhrIc      = new XHRInterceptor(this._onReq.bind(this));
    this._errIc      = new ErrorInterceptor(this._onErr.bind(this));
  }

  /* ── Public API ──────────────────────────────────────────────── */

  start() {
    if (this._running || !this.config.enabled) return this;
    this._running = true;
    this._fetchIc.install();
    this._xhrIc.install();
    this._errIc.install();
    this._flushTimer  = setInterval(() => this._flush(), this.config.flushInterval);
    this._healthTimer = setInterval(() => this._collectHealth(), this.config.healthInterval);
    this._collectHealth(); // immediate first health snapshot
    this._log(`Started — service: ${this.serviceName}`);
    return this;
  }

  async stop() {
    if (!this._running) return;
    this._running = false;
    this._fetchIc.uninstall();
    this._xhrIc.uninstall();
    this._errIc.uninstall();
    clearInterval(this._flushTimer);
    clearInterval(this._healthTimer);
    await this._flush();
    this._log('Stopped. Stats:', this._stats);
  }

  trackRequest(data = {}) {
    this._stats.totalRequests++;
    this._stats.totalLatency += data.responseTimeMs || 0;
    if (!data.success) this._stats.totalErrors++;
    this._enqueue(this._metric({
      requests: {
        endpoint:       data.endpoint       || '/',
        method:         (data.method        || 'GET').toUpperCase(),
        statusCode:     data.statusCode     || 200,
        responseTimeMs: data.responseTimeMs || 0,
        success:        data.success        !== false,
        errorCount:     data.errorCount     || (data.success === false ? 1 : 0),
        total:          1,
      },
    }));
  }

  trackError(error, ctx = {}) {
    const msg   = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack   : '';
    this._enqueue(this._metric({
      requests: {
        endpoint:       ctx.endpoint || '/error',
        method:         ctx.method   || 'GET',
        statusCode:     ctx.statusCode || 500,
        responseTimeMs: ctx.responseTimeMs || 0,
        success:        false,
        errorCount:     1,
        total:          1,
      },
      tags: {
        errorMessage: msg.substring(0, 200),
        errorStack:   stack.substring(0, 500),
        errorType:    ctx.type || 'manual',
        ...(ctx.tags || {}),
      },
    }));
  }

  trackCustomMetric(name, value, tags = {}) {
    this._enqueue(this._metric({
      tags: { customMetricName: name, customMetricValue: String(value), ...tags },
    }));
  }

  getStats() {
    const avgLatency = this._stats.totalRequests > 0
      ? Math.round(this._stats.totalLatency / this._stats.totalRequests) : 0;
    const errorRate = this._stats.totalRequests > 0
      ? parseFloat(((this._stats.totalErrors / this._stats.totalRequests) * 100).toFixed(2)) : 0;
    const score = computeHealthScore({ errorRate, avgLatency });
    return {
      ...this._stats, avgLatency, errorRate,
      healthScore: score, healthStatus: toHealthStatus(score),
      queueSize: this._queue.length, serviceName: this.serviceName,
    };
  }

  /* ── Internal ────────────────────────────────────────────────── */

  _metric(overrides = {}) {
    const mem = getMemoryMB();
    return {
      serviceName:  this.serviceName,
      instanceId:   this._id(),
      timestamp:    new Date().toISOString(),
      healthStatus: 'unknown',
      cpu:     { usagePercent: 0, loadAverage: 0, cores: navigator?.hardwareConcurrency || 4 },
      memory:  { usedMb: mem, totalMb: 2048, usagePercent: Math.round((mem / 2048) * 100) },
      disk:    { usedMb: 0, totalMb: 0, usagePercent: 0, readBytesPerSec: 0, writeBytesPerSec: 0 },
      network: { inboundBytesPerSec: 0, outboundBytesPerSec: 0, activeConnections: 0 },
      requests: { endpoint: '/', method: 'GET', statusCode: 200, responseTimeMs: 0, success: true, errorCount: 0, total: 1 },
      tags:    {},
      ...overrides,
    };
  }

  _onReq(data) { this.trackRequest(data); }
  _onErr(data) {
    this.trackError(
      { message: data.message, stack: data.stack },
      { type: data.type, endpoint: data.source }
    );
  }

  async _collectHealth() {
    const cpu = await estimateCPULoad();
    const mem = getMemoryMB();
    const stats = this.getStats();
    const score = computeHealthScore({ errorRate: stats.errorRate, avgLatency: stats.avgLatency, cpuUsage: cpu });
    const metric = this._metric({
      healthStatus: toHealthStatus(score),
      cpu:    { usagePercent: Math.round(cpu * 25), loadAverage: cpu, cores: navigator?.hardwareConcurrency || 4 },
      memory: { usedMb: mem, totalMb: 2048, usagePercent: Math.round((mem / 2048) * 100) },
      tags:   { type: 'health_check', healthScore: String(score) },
    });
    this._enqueue(metric);
  }

  _enqueue(metric) {
    if (!this.config.enabled) return;
    if (this._queue.length >= this.config.maxQueueSize) { this._queue.shift(); this._stats.dropped++; }
    this._queue.push(metric);
    if (this._queue.length >= this.config.batchSize) this._flush();
  }

  async _flush() {
    if (!this._queue.length) return;
    const batch = this._queue.splice(0, this.config.batchSize);
    for (const m of batch) {
      try {
        await withRetry(() => fetch(this.config.backendUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(m),
        }), this.config.retryAttempts, this.config.retryDelay);
        this._stats.sent++;
      } catch { this._stats.failed++; }
    }
  }

  _id() {
    if (!this._instanceId)
      this._instanceId = `${this.serviceName}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    return this._instanceId;
  }

  _log(...a) { if (this.config.debug) console.log('[ObserveAI]', ...a); }
}

// ─── Legacy sendMetrics (backward compatible) ─────────────────────────────────
export const sendMetrics = async (serviceName = 'frontend-app', endpoint = '/test', method = 'GET') => {
  try {
    const elapsed = startTimer();
    let statusCode = 200;
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/test`); statusCode = r.status; }
    catch { statusCode = 500; }
    const responseTimeMs = elapsed();
    const mem = getMemoryMB();
    const cpu = await estimateCPULoad();
    const success = statusCode < 400;

    await fetch(`${import.meta.env.VITE_API_URL}/api/ingest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName,
        instanceId:   `${serviceName}-legacy`,
        timestamp:    new Date().toISOString(),
        healthStatus: success ? 'healthy' : 'warning',
        cpu:    { usagePercent: Math.round(cpu * 25), loadAverage: cpu, cores: navigator?.hardwareConcurrency || 4 },
        memory: { usedMb: mem, totalMb: 2048, usagePercent: Math.round((mem / 2048) * 100) },
        disk:    { usedMb: 0, totalMb: 0, usagePercent: 0, readBytesPerSec: 0, writeBytesPerSec: 0 },
        network: { inboundBytesPerSec: 0, outboundBytesPerSec: 0, activeConnections: 0 },
        requests: { endpoint, method: method.toUpperCase(), statusCode, responseTimeMs, success, errorCount: success ? 0 : 1, total: 1 },
        tags: { source: 'legacy_sdk' },
      }),
    });
  } catch (err) {
    console.error('[ObserveAI] sendMetrics failed:', err.message);
  }
};

export default ObserveAI;