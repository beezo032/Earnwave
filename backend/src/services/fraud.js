const crypto = require("crypto");
const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { devices, suspiciousActivity, users, riskReviews, withdrawals, ledgerEntries } = require("../db/demoStore");

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

const REASON_CODE_CATALOG = {
  TURNSTILE_FAILED: "Cloudflare Turnstile did not return a successful verification.",
  TURNSTILE_MISSING: "No Turnstile result was supplied for an action that expects bot protection.",
  IP_HIGH_RISK: "IP intelligence indicates proxy, VPN, hosting, Tor, or anonymous network risk.",
  ASN_DATACENTER: "ASN metadata points to a hosting or datacenter network.",
  COUNTRY_MISMATCH: "IP country does not match the account or payout country on file.",
  DEVICE_FINGERPRINT_MISSING: "No durable device fingerprint was supplied.",
  DEVICE_SEEN_ON_OTHER_ACCOUNT: "The device fingerprint has appeared on another account.",
  MULTIPLE_ACCOUNTS_SAME_IP: "Multiple accounts have used the same IP address.",
  MANY_ACCOUNTS_SAME_EMAIL_DOMAIN: "Several accounts share the same email domain pattern.",
  NEW_ACCOUNT_HIGH_VALUE_PAYOUT: "A newer account is attempting a higher-value payout.",
  PROVIDER_REVERSAL_HISTORY: "The account or provider history includes reward reversals.",
  HIGH_PAYOUT_AMOUNT: "The requested payout is above the normal automatic-review threshold.",
  ANDROID_PLAY_INTEGRITY_FAILED: "Android Play Integrity verdict did not meet device integrity.",
  IOS_APP_ATTEST_FAILED: "iOS App Attest status failed or was not trusted.",
  DUPLICATE_HOUSEHOLD: "Household or payment destination indicators overlap with another account.",
  WITHDRAWAL_THRESHOLD_PRESSURE: "The payout would withdraw most of the available balance.",
  PAYOUT_VELOCITY_HIGH: "Recent withdrawal attempts or payout volume are unusually high.",
  PAYOUT_DESTINATION_REUSED: "The payout destination has been used by another account.",
  IP_REPUTATION_UNAVAILABLE: "Configured IP reputation provider did not return a usable result.",
  PRIVATE_NETWORK_IP: "The request came through a private network address.",
  MULTI_HOP_FORWARDED_FOR: "Forwarded headers show a multi-hop network path.",
  MANY_PROXY_HEADERS: "Several proxy-related headers appeared on the request.",
  BASELINE_LOW_RISK: "No elevated risk indicators were detected."
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeVerdict(value = "") {
  return String(value || "").trim().toLowerCase();
}

function addReason(state, code, points) {
  if (!code || state.reason_codes.includes(code)) return;
  state.reason_codes.push(code);
  state.risk_score += points;
}

function actionForScore(score) {
  if (score >= 85) return "deny";
  if (score >= 65) return "manual_review";
  if (score >= 35) return "hold";
  return "allow";
}

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

async function providerReversalCountForUser(userId) {
  if (!userId) return 0;

  if (!env.DATABASE_URL) {
    return ledgerEntries.filter(entry =>
      String(entry.user_id) === String(userId)
      && (String(entry.type || "").includes("reversal") || String(entry.status || entry.payout_status || "").toLowerCase() === "reversed")
    ).length;
  }

  const result = await query(
    `SELECT COUNT(*) AS reversal_count
     FROM ledger_entries
     WHERE user_id = $1
       AND (type ILIKE '%reversal%' OR payout_status = 'reversed')`,
    [userId]
  );
  return Number(result.rows[0]?.reversal_count || 0);
}

async function duplicatePayoutDestinationSignals({ userId, destinationValue }) {
  const normalizedDestination = String(destinationValue || "").trim().toLowerCase();
  if (!normalizedDestination) return [];

  if (!env.DATABASE_URL) {
    const seenElsewhere = withdrawals.some(item =>
      String(item.user_id) !== String(userId)
      && String(item.destination_value || "").trim().toLowerCase() === normalizedDestination
    );
    return seenElsewhere ? ["payout_destination_seen_on_other_account"] : [];
  }

  const result = await query(
    `SELECT COUNT(DISTINCT user_id) AS matched_accounts
     FROM withdrawals
     WHERE lower(destination_value) = $1
       AND user_id::text <> $2`,
    [normalizedDestination, String(userId)]
  );

  return Number(result.rows[0]?.matched_accounts || 0) > 0 ? ["payout_destination_reused"] : [];
}
async function verifyTurnstileToken({ token, ip }) {
  if (!token) return { result: "missing", success: false, reason: "missing_token" };
  if (!env.TURNSTILE_SECRET_KEY) return { result: "missing", success: false, reason: "missing_secret" };

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip || "" })
    });
    const payload = await response.json();
    return { result: payload.success ? "success" : "failed", success: Boolean(payload.success), payload };
  } catch (error) {
    return { result: "failed", success: false, reason: "verification_error", message: error.message };
  }
}

async function lookupIpReputation(req) {
  const ip = getClientIp(req);
  const provider = String(env.IP_REPUTATION_PROVIDER || "").toLowerCase();
  const fallback = {
    ip,
    reputation: req.headers["x-ip-intel"] || req.headers["x-ip-risk"] || "",
    asn: req.headers["x-asn"] || req.headers["x-asn-type"] || "",
    country: req.headers["x-ip-country"] || "",
    source: "headers"
  };

  if (!provider || !env.IP_REPUTATION_API_KEY) return fallback;

  try {
    if (provider === "ipqualityscore" || provider === "ipqs") {
      const response = await fetch(`https://ipqualityscore.com/api/json/ip/${env.IP_REPUTATION_API_KEY}/${encodeURIComponent(ip)}?strictness=1&allow_public_access_points=true`);
      const payload = await response.json();
      const risky = [payload.proxy && "proxy", payload.vpn && "vpn", payload.tor && "tor", payload.active_vpn && "vpn", payload.active_tor && "tor", payload.recent_abuse && "abuse", payload.bot_status && "bot"].filter(Boolean).join(" ");
      return { ip, reputation: risky || String(payload.fraud_score || ""), asn: payload.ISP || payload.organization || "", country: payload.country_code || "", source: provider, raw: payload };
    }

    if (provider === "ipinfo") {
      const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${env.IP_REPUTATION_API_KEY}`);
      const payload = await response.json();
      const privacy = payload.privacy || {};
      const risky = [privacy.vpn && "vpn", privacy.proxy && "proxy", privacy.tor && "tor", privacy.hosting && "hosting"].filter(Boolean).join(" ");
      return { ip, reputation: risky, asn: payload.org || "", country: payload.country || "", source: provider, raw: payload };
    }

    return fallback;
  } catch (error) {
    return { ...fallback, reputation: env.IP_REPUTATION_STRICT ? "unavailable high" : fallback.reputation, source: provider, error: error.message };
  }
}

async function withdrawalVelocitySignals({ userId, amountWaveCoins = 0 }) {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const dailyLimit = env.WITHDRAWAL_VELOCITY_DAILY_LIMIT;
  const weeklyLimit = env.WITHDRAWAL_VELOCITY_WEEKLY_LIMIT;
  const dailyWaveCoinLimit = env.WITHDRAWAL_VELOCITY_DAILY_WAVECOINS;

  if (!env.DATABASE_URL) {
    const userRows = withdrawals.filter(item => String(item.user_id) === String(userId));
    const lastDay = userRows.filter(item => new Date(item.created_at || 0) >= dayAgo);
    const lastWeek = userRows.filter(item => new Date(item.created_at || 0) >= weekAgo);
    const dailyWaveCoins = lastDay.reduce((sum, item) => sum + Number(item.amount_wavecoins || Math.round(Number(item.amount || 0) * 100) || 0), 0) + Number(amountWaveCoins || 0);
    return [lastDay.length >= dailyLimit, lastWeek.length >= weeklyLimit, dailyWaveCoins > dailyWaveCoinLimit].some(Boolean) ? ["payout_velocity_high"] : [];
  }

  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS day_count,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS week_count,
       COALESCE(SUM(CASE WHEN created_at >= now() - interval '24 hours' THEN amount_cents ELSE 0 END), 0) AS day_wavecoins
     FROM withdrawals
     WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0] || {};
  const dayCount = Number(row.day_count || 0);
  const weekCount = Number(row.week_count || 0);
  const dailyWaveCoins = Number(row.day_wavecoins || 0) + Number(amountWaveCoins || 0);
  return [dayCount >= dailyLimit, weekCount >= weeklyLimit, dailyWaveCoins > dailyWaveCoinLimit].some(Boolean) ? ["payout_velocity_high"] : [];
}
async function flagSuspiciousActivity({ userId, eventType, risk, metadata = {} }) {
  const score = risk.risk_score ?? risk.score ?? 0;
  const reasonCodes = risk.reason_codes || risk.signals || [];
  const severity = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    event_type: eventType,
    severity,
    score,
    signals: reasonCodes,
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
    [userId, eventType, severity, score, reasonCodes, risk.ip, risk.deviceHash, JSON.stringify(metadata)]
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

function scoreFraudRisk(input = {}) {
  const state = { risk_score: 0, reason_codes: [] };
  const turnstile = normalizeVerdict(input.turnstileResult);
  const ipReputation = normalizeVerdict(input.ipReputation);
  const asn = normalizeVerdict(input.asn);
  const country = normalizeVerdict(input.country);
  const accountCountry = normalizeVerdict(input.accountCountry);
  const payoutCountry = normalizeVerdict(input.payoutCountry);
  const androidVerdict = normalizeVerdict(input.androidPlayIntegrityVerdict);
  const iosStatus = normalizeVerdict(input.iosAppAttestStatus);
  const payoutAmount = Number(input.payoutAmount || 0);
  const accountAgeDays = Number(input.accountAgeDays ?? 999);
  const providerReversalCount = Number(input.providerReversalCount || 0);
  const duplicateHouseholdIndicators = Array.isArray(input.duplicateHouseholdIndicators)
    ? input.duplicateHouseholdIndicators
    : [];

  if (turnstile && !["success", "passed", "ok", "true"].includes(turnstile)) {
    addReason(state, "TURNSTILE_FAILED", 30);
  } else if (input.requiresTurnstile && !turnstile) {
    addReason(state, "TURNSTILE_MISSING", 15);
  }

  if (["high", "vpn", "proxy", "tor", "datacenter", "hosting", "anonymous"].some(value => ipReputation.includes(value))) {
    addReason(state, "IP_HIGH_RISK", 35);
  }

  if (["hosting", "datacenter", "cloud", "vpn", "proxy"].some(value => asn.includes(value))) {
    addReason(state, "ASN_DATACENTER", 20);
  }

  if (country && ((accountCountry && country !== accountCountry) || (payoutCountry && country !== payoutCountry))) {
    addReason(state, "COUNTRY_MISMATCH", 25);
  }

  if (!input.deviceFingerprintHash) {
    addReason(state, "DEVICE_FINGERPRINT_MISSING", 12);
  }

  for (const signal of input.duplicateAccountSignals || []) {
    const code = String(signal).toUpperCase();
    if (REASON_CODE_CATALOG[code]) addReason(state, code, 20);
  }

  for (const signal of input.payoutVelocitySignals || []) {
    const code = String(signal).toUpperCase();
    if (REASON_CODE_CATALOG[code]) addReason(state, code, 30);
  }

  if (accountAgeDays < 7 && payoutAmount >= 25) addReason(state, "NEW_ACCOUNT_HIGH_VALUE_PAYOUT", 25);
  if (providerReversalCount > 0) addReason(state, "PROVIDER_REVERSAL_HISTORY", Math.min(35, providerReversalCount * 15));
  if (payoutAmount >= 100) addReason(state, "HIGH_PAYOUT_AMOUNT", 25);
  else if (payoutAmount >= 50) addReason(state, "HIGH_PAYOUT_AMOUNT", 15);

  if (androidVerdict && !["meets_device_integrity", "meets_strong_integrity", "pass", "trusted"].some(value => androidVerdict.includes(value))) {
    addReason(state, "ANDROID_PLAY_INTEGRITY_FAILED", 30);
  }

  if (iosStatus && !["verified", "valid", "trusted", "pass"].includes(iosStatus)) {
    addReason(state, "IOS_APP_ATTEST_FAILED", 30);
  }

  if (duplicateHouseholdIndicators.includes("payout_destination_reused")) {
    addReason(state, "PAYOUT_DESTINATION_REUSED", 35);
  } else if (duplicateHouseholdIndicators.length) {
    addReason(state, "DUPLICATE_HOUSEHOLD", Math.min(30, duplicateHouseholdIndicators.length * 15));
  }

  for (const signal of input.networkSignals || []) {
    if (signal === "private_network_ip") addReason(state, "PRIVATE_NETWORK_IP", 4);
    if (signal === "multi_hop_forwarded_for") addReason(state, "MULTI_HOP_FORWARDED_FOR", 12);
    if (signal === "many_proxy_headers") addReason(state, "MANY_PROXY_HEADERS", 12);
    if (signal === "vpn_proxy_or_datacenter_intel") addReason(state, "IP_HIGH_RISK", 35);
  }

  if (input.withdrawalAmount && input.balance && Number(input.withdrawalAmount) >= Number(input.balance) * .9) {
    addReason(state, "WITHDRAWAL_THRESHOLD_PRESSURE", 25);
  }

  if (state.reason_codes.length === 0) addReason(state, "BASELINE_LOW_RISK", 0);
  state.risk_score = clampScore(state.risk_score);
  state.action = actionForScore(state.risk_score);
  state.severity = state.risk_score >= 75 ? "high" : state.risk_score >= 45 ? "medium" : "low";
  state.explanations = state.reason_codes.map(code => ({ code, description: REASON_CODE_CATALOG[code] || "Uncataloged risk signal." }));
  state.score = state.risk_score;
  state.signals = state.reason_codes;
  return state;
}

async function persistRiskReview({ userId, eventType, risk, input = {}, metadata = {} }) {
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    event_type: eventType,
    risk_score: risk.risk_score,
    action: risk.action,
    reason_codes: risk.reason_codes,
    input,
    metadata,
    created_at: new Date().toISOString()
  };

  if (!env.DATABASE_URL) {
    riskReviews.unshift(row);
    return row;
  }

  const result = await query(
    `INSERT INTO risk_reviews (user_id, event_type, risk_score, action, reason_codes, input, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId || null, eventType, risk.risk_score, risk.action, risk.reason_codes, JSON.stringify(input), JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function buildRisk(req, extra = {}) {
  const proxy = detectProxy(req);
  const deviceHash = getDeviceHash(req);
  const duplicateAccountSignals = (extra.duplicateSignals || []).map(signal => {
    if (signal === "device_seen_on_other_account") return "DEVICE_SEEN_ON_OTHER_ACCOUNT";
    if (signal === "multiple_accounts_same_ip") return "MULTIPLE_ACCOUNTS_SAME_IP";
    if (signal === "many_accounts_same_email_domain") return "MANY_ACCOUNTS_SAME_EMAIL_DOMAIN";
    if (signal === "payout_velocity_high") return "PAYOUT_VELOCITY_HIGH";
    return signal;
  });

  const payoutVelocitySignals = (extra.payoutVelocitySignals || []).map(signal => {
    if (signal === "payout_velocity_high") return "PAYOUT_VELOCITY_HIGH";
    return signal;
  });

  const risk = scoreFraudRisk({
    turnstileResult: extra.turnstileResult || req.headers["x-turnstile-result"],
    requiresTurnstile: Boolean(extra.requiresTurnstile),
    ipReputation: extra.ipReputation || req.headers["x-ip-intel"] || req.headers["x-ip-risk"],
    asn: extra.asn || req.headers["x-asn"] || req.headers["x-asn-type"],
    country: extra.ipCountry || req.headers["x-ip-country"],
    accountCountry: extra.accountCountry,
    payoutCountry: extra.payoutCountry,
    deviceFingerprintHash: req.headers["x-device-hash"],
    accountAgeDays: extra.accountAgeDays,
    providerReversalCount: extra.providerReversalCount,
    payoutAmount: extra.withdrawalAmount,
    androidPlayIntegrityVerdict: extra.androidPlayIntegrityVerdict || req.headers["x-play-integrity"],
    iosAppAttestStatus: extra.iosAppAttestStatus || req.headers["x-app-attest"],
    duplicateHouseholdIndicators: extra.duplicateHouseholdIndicators || [],
    duplicateAccountSignals,
    payoutVelocitySignals,
    networkSignals: proxy.signals,
    withdrawalAmount: extra.withdrawalAmount,
    balance: extra.balance
  });

  return {
    ...risk,
    ip: proxy.ip,
    deviceHash
  };
}

module.exports = {
  REASON_CODE_CATALOG,
  buildRisk,
  closeSuspiciousActivity,
  detectProxy,
  duplicateAccountSignals,
  duplicatePayoutDestinationSignals,
  flagSuspiciousActivity,
  getClientIp,
  getDeviceHash,
  listSuspiciousActivity,
  lookupIpReputation,
  persistRiskReview,
  providerReversalCountForUser,
  registerDevice,
  scoreFraudRisk,
  verifyTurnstileToken,
  withdrawalVelocitySignals
};

