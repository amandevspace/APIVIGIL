const dns = require("dns").promises;
const net = require("net");
const { integrationConfig } = require("../config/integration");

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return net.isIPv6(address) && (address === "::1" || address.startsWith("fc") || address.startsWith("fd"));
}

async function validateProxyRequest(req, res, next) {
  const { url, method = "GET", headers } = req.body || {};
  const normalizedMethod = String(method).toUpperCase();

  if (!url || typeof url !== "string") return res.status(400).json({ error: "url is required and must be a string" });
  if (!integrationConfig.allowedMethods.includes(normalizedMethod)) return res.status(400).json({ error: `Method ${method} is not allowed` });
  if (headers !== undefined && (typeof headers !== "object" || Array.isArray(headers))) return res.status(400).json({ error: "headers must be an object" });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http and https URLs are allowed");
    if (integrationConfig.allowedDomains.length && !integrationConfig.allowedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) {
      throw new Error("Target domain is not allowed");
    }
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private network targets are not allowed");
  } catch (error) {
    return res.status(400).json({ error: error.message === "Target domain is not allowed" || error.message === "Private network targets are not allowed" ? error.message : "Invalid or unsafe URL" });
  }

  req.body.method = normalizedMethod;
  return next();
}

module.exports = validateProxyRequest;