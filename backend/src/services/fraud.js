const crypto = require("crypto");
const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { devices, suspiciousActivity, users } = require("../db/demoStore");

const knownProxyHeaders = [
  "x-forwarded-for",
  "x-real-ip",
  "forwarded",
  "cf-connecting-ip",
  "true-client-ip"
];

const dataCenterIndicators = [
  "vpn",
  "proxy",
  "hosting",
  "datacenter",
  "tor",
  "anonymous"
];

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
}

function getDeviceHash(req) {
  const provided = req.headers["x-device-hash"];
  if (provided) return String(provided).slice(0, 128);

  const fallback = [
    req.headers["user-agent"] || "unknown-agent",
    req.headers.accept || "unknown-accept",
    req.headers["accept-language"] || "unknown-language"
  ].join("|");

  return crypto.createHash("sha256").update(fallback).digest("hex");
}

function detectProxy(req) {
  const signals = [];
  const ip = getClientIp(req);
  const ipIntel = String(req.headers["x-ip-intel"] || req.headers["x-ip-risk"] || "").toLowerCase();
  const forwardedCount = String(req.headers["x-forwarded-for"] || "").split(",").filter(Boolean).length;

  if (knownProxyHeaders.filter(header => req.headers[header]).length >= 3) {
    signals.push("many_proxy_headers");
  }

  if (forwardedCount > 2) {
    signals.push("multi_hop_forwarded_for");
  }

  if (dataCenterIndicators.some(indicator => ipIntel.includes(indicator))) {
    signals.push("vpn_proxy_or_datacenter_intel");
  }

  if (String(ip).startsWith("10.") || String(ip).startsWith("172.") || String(ip).startsWith("192.168.")) {
    signals.push("private_network_ip");
  }

  return {
    ip,
    proxyLikely: signals.some(signal => signal !== "private_network_ip"),
    signals
  };
}

async function registerDevice({ userId, req }) {
  const deviceHash = getDeviceHash(req);
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";

  if (!env.DATABASE_URL) {
    const existing = devices.find(device => device.user_id === userId && device.device_hash === deviceHash);
    if (existing) {
      existing.last_seen_at = new Date().toISOString();
      return existing;
    }
    const row = { id: String(devices.length + 1), user_id: userId, device_hash: deviceHash, ip_address: ip, user_agent: userAgent, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString() };
    devices.push(row);
    return row;
  }

  const result = await query(
    `INSERT INTO user_devices (user_id, device_hash, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, device_hash)
     DO UPDATE SET last_seen_at = now(), ip_address = EXCLUDED.ip_address, user_agent = EXCLUDED.user_agent
     RETURNING *`,
    [userId, deviceHash, ip, userAgent]
  );
  return result.rows[0];
}

async function duplicateAccountSignals({ email, req, currentUserId }) {
  const signals = [];
  const deviceHash = getDeviceHash(req);
  const ip = getClientIp(req);
  const domain = String(email || "").split("@")[1]?.toLowerCase();

  if (!env.DATABASE_URL) {
    const sameDomainCount = [...users.values()].filter(user => user.email?.split("@")[1]?.toLowerCase() === domain).length;
    const sameDeviceCount = devices.filter(device => device.device_hash === deviceHash && device.user_id !== currentUserId).length;
    const sameIpCount = devices.filter(device => device.ip_address === ip && device.user_id !== currentUserId).length;

    if (sameDomainCount >= 3) signals.push("many_accounts_same_email_domain");
    if (sameDeviceCount > 0) signals.push("device_seen_on_other_account");
    if (sameIpCount >= 2) signals.push("multiple_accounts_same_ip");
    return signals;
  }

  const result = await query(
    `SELECT
      (SELECT COUNT(*) FROM users WHERE split_part(email, '@', 2) = $1) AS same_domain,
      (SELECT COUNT(DISTINCT user_id) FROM user_devices WHERE device_hash = $2 AND user_id::text <> COALESCE($4, '')) AS same_device,
      (SELECT COUNT(DISTINCT user_id) FROM user_devices WHERE ip_address = $3 AND user_id::text <> COALESCE($4, '')) AS same_ip`,
    [domain, deviceHash, ip, currentUserId ? String(currentUserId) : null]
  );

  const row = result.rows[0];
  if (Number(row.same_domain) >= 3) signals.push("many_accounts_same_email_domain");
  if (Number(row.same_device) > 0) signals.push("device_seen_on_other_account");
  if (Number(row.same_ip) >= 2) signals.push("multiple_accounts_same_ip");
  return signals;
}

async function flagSuspiciousActivity({ userId, eventType, risk, metadata = {} }) {
  const severity = risk.score >= 75 ? "high" : risk.score >= 45 ? "medium" : "low";
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    event_type: eventType,
    severity,
    score: risk.score,
    signals: risk.signals,
    ip_address: risk.ip,
    device_hash: risk.deviceHash,
    metadata,
    status: "open",
    created_at: new Date().toISOString()
  };

  if (!env.DATABASE_URL) {
    suspiciousActivity.unshift(row);
    return row;
  }

  const result = await query(
    `INSERT INTO suspicious_activity (user_id, event_type, severity, score, signals, ip_address, device_hash, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, eventType, severity, risk.score, risk.signals, risk.ip, risk.deviceHash, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function listSuspiciousActivity() {
  if (!env.DATABASE_URL) return suspiciousActivity;

  const result = await query(`
    SELECT s.*, u.name AS user_name, u.email
    FROM suspicious_activity s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.status = 'open'
    ORDER BY s.created_at DESC
    LIMIT 100
  `);
  return result.rows;
}

async function closeSuspiciousActivity({ id, status = "closed" }) {
  if (!env.DATABASE_URL) {
    const row = suspiciousActivity.find(item => item.id === id);
    if (row) row.status = status;
    return { ok: true };
  }

  await query("UPDATE suspicious_activity SET status = $1 WHERE id = $2", [status, id]);
  return { ok: true };
}

async function buildRisk(req, extra = {}) {
  const proxy = detectProxy(req);
  const deviceHash = getDeviceHash(req);
  const signals = [...proxy.signals];
  let score = 0;

  if (!req.headers["x-device-hash"]) {
    score += 12;
    signals.push("missing_client_fingerprint");
  }

  if (proxy.proxyLikely) {
    score += 35;
  }

  if (extra.highValue) {
    score += 15;
    signals.push("high_value_action");
  }

  if (extra.withdrawalAmount && extra.balance && extra.withdrawalAmount >= extra.balance * .9) {
    score += 25;
    signals.push("withdrawal_threshold_pressure");
  }

  if (extra.duplicateSignals?.length) {
    score += Math.min(40, extra.duplicateSignals.length * 20);
    signals.push(...extra.duplicateSignals);
  }

  if (signals.length === 0) signals.push("baseline_low_risk");

  return {
    score,
    severity: score >= 75 ? "high" : score >= 45 ? "medium" : "low",
    signals: [...new Set(signals)],
    ip: proxy.ip,
    deviceHash
  };
}

module.exports = {
  buildRisk,
  closeSuspiciousActivity,
  detectProxy,
  duplicateAccountSignals,
  flagSuspiciousActivity,
  getClientIp,
  getDeviceHash,
  listSuspiciousActivity,
  registerDevice
};
