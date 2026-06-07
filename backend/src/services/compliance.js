const crypto = require("crypto");
const { env } = require("../config/env");
const { query } = require("../db/postgres");
const {
  complianceProfiles,
  complianceThresholds,
  dataSubjectRequests,
  privacyConsentAudit,
  users
} = require("../db/demoStore");

const DEFAULT_THRESHOLDS = {
  US: { country: "US", kyc_threshold_cents: 5000, tax_threshold_cents: 60000, required_tax_form: "W-9" },
  DEFAULT: { country: "DEFAULT", kyc_threshold_cents: 2500, tax_threshold_cents: 0, required_tax_form: "W-8" }
};

const COOKIE_CONSENT_CATEGORIES = ["necessary", "analytics", "marketing", "fraud_prevention", "preferences"];

function normalizeCountry(country = "") {
  return String(country || "").trim().toUpperCase() || "DEFAULT";
}

function cents(value) {
  return Math.max(0, Math.round(Number(value || 0)));
}

function serializeProfile(row = {}) {
  return {
    user_id: row.user_id,
    country: row.country || "",
    kyc_status: row.kyc_status || "not_started",
    w9_status: row.w9_status || "not_started",
    w8_status: row.w8_status || "not_started",
    payout_locked: Boolean(row.payout_locked),
    lock_reason: row.lock_reason || "",
    updated_at: row.updated_at
  };
}

function serializeThreshold(row = {}) {
  return {
    country: normalizeCountry(row.country),
    kyc_threshold_cents: cents(row.kyc_threshold_cents),
    tax_threshold_cents: cents(row.tax_threshold_cents),
    required_tax_form: row.required_tax_form || (normalizeCountry(row.country) === "US" ? "W-9" : "W-8"),
    updated_at: row.updated_at
  };
}

async function getComplianceThreshold(country = "DEFAULT") {
  const normalized = normalizeCountry(country);
  if (!env.DATABASE_URL) {
    const match = complianceThresholds.find(item => item.country === normalized)
      || complianceThresholds.find(item => item.country === "DEFAULT")
      || DEFAULT_THRESHOLDS[normalized]
      || DEFAULT_THRESHOLDS.DEFAULT;
    return serializeThreshold(match);
  }

  const result = await query(
    "SELECT * FROM compliance_thresholds WHERE country IN ($1, 'DEFAULT') ORDER BY country = $1 DESC LIMIT 1",
    [normalized]
  );
  return serializeThreshold(result.rows[0] || DEFAULT_THRESHOLDS[normalized] || DEFAULT_THRESHOLDS.DEFAULT);
}

async function upsertComplianceThreshold({ country, kycThresholdCents, taxThresholdCents, requiredTaxForm, adminId }) {
  const row = {
    country: normalizeCountry(country),
    kyc_threshold_cents: cents(kycThresholdCents),
    tax_threshold_cents: cents(taxThresholdCents),
    required_tax_form: requiredTaxForm || (normalizeCountry(country) === "US" ? "W-9" : "W-8"),
    updated_by: adminId || null,
    updated_at: new Date().toISOString()
  };

  if (!env.DATABASE_URL) {
    const index = complianceThresholds.findIndex(item => item.country === row.country);
    if (index >= 0) complianceThresholds[index] = row;
    else complianceThresholds.push(row);
    return serializeThreshold(row);
  }

  const result = await query(
    `INSERT INTO compliance_thresholds (country, kyc_threshold_cents, tax_threshold_cents, required_tax_form, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (country)
     DO UPDATE SET kyc_threshold_cents = EXCLUDED.kyc_threshold_cents,
                   tax_threshold_cents = EXCLUDED.tax_threshold_cents,
                   required_tax_form = EXCLUDED.required_tax_form,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = now()
     RETURNING *`,
    [row.country, row.kyc_threshold_cents, row.tax_threshold_cents, row.required_tax_form, row.updated_by]
  );
  return serializeThreshold(result.rows[0]);
}

async function getComplianceProfile(userId) {
  if (!env.DATABASE_URL) {
    const existing = complianceProfiles.find(item => String(item.user_id) === String(userId));
    if (existing) return serializeProfile(existing);
    const user = users.get(String(userId));
    return serializeProfile({ user_id: userId, country: user?.country || "" });
  }

  const result = await query("SELECT * FROM compliance_profiles WHERE user_id = $1", [userId]);
  if (result.rows[0]) return serializeProfile(result.rows[0]);

  const userResult = await query("SELECT id, country FROM users WHERE id = $1", [userId]);
  return serializeProfile({ user_id: userId, country: userResult.rows[0]?.country || "" });
}

async function updateComplianceProfile({ userId, country, kycStatus, w9Status, w8Status, payoutLocked, lockReason }) {
  const current = await getComplianceProfile(userId);
  const row = {
    user_id: userId,
    country: country !== undefined ? normalizeCountry(country) : current.country,
    kyc_status: kycStatus || current.kyc_status,
    w9_status: w9Status || current.w9_status,
    w8_status: w8Status || current.w8_status,
    payout_locked: payoutLocked !== undefined ? Boolean(payoutLocked) : current.payout_locked,
    lock_reason: lockReason !== undefined ? lockReason : current.lock_reason,
    updated_at: new Date().toISOString()
  };

  if (!env.DATABASE_URL) {
    const index = complianceProfiles.findIndex(item => String(item.user_id) === String(userId));
    if (index >= 0) complianceProfiles[index] = row;
    else complianceProfiles.push(row);
    const user = users.get(String(userId));
    if (user) user.country = row.country;
    return serializeProfile(row);
  }

  await query("UPDATE users SET country = $1 WHERE id = $2", [row.country, userId]);
  const result = await query(
    `INSERT INTO compliance_profiles (user_id, country, kyc_status, w9_status, w8_status, payout_locked, lock_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id)
     DO UPDATE SET country = EXCLUDED.country,
                   kyc_status = EXCLUDED.kyc_status,
                   w9_status = EXCLUDED.w9_status,
                   w8_status = EXCLUDED.w8_status,
                   payout_locked = EXCLUDED.payout_locked,
                   lock_reason = EXCLUDED.lock_reason,
                   updated_at = now()
     RETURNING *`,
    [userId, row.country, row.kyc_status, row.w9_status, row.w8_status, row.payout_locked, row.lock_reason]
  );
  return serializeProfile(result.rows[0]);
}

async function evaluatePayoutEligibility({ userId, payoutAmountCents = 0 }) {
  const profile = await getComplianceProfile(userId);
  const country = normalizeCountry(profile.country);
  const threshold = await getComplianceThreshold(country);
  const blocked_reasons = [];
  const required = [];
  const amount = cents(payoutAmountCents);

  if (!profile.country) {
    blocked_reasons.push("COUNTRY_REQUIRED");
    required.push("country");
  }

  if (profile.payout_locked) {
    blocked_reasons.push(profile.lock_reason || "COMPLIANCE_LOCK");
  }

  if (amount >= threshold.kyc_threshold_cents && profile.kyc_status !== "verified") {
    blocked_reasons.push("KYC_REQUIRED");
    required.push("kyc");
  }

  if (amount >= threshold.tax_threshold_cents) {
    const taxForm = threshold.required_tax_form === "W-9" ? "w9" : "w8";
    const status = taxForm === "w9" ? profile.w9_status : profile.w8_status;
    if (status !== "collected") {
      blocked_reasons.push(`${threshold.required_tax_form}_REQUIRED`);
      required.push(taxForm);
    }
  }

  return {
    can_pay: blocked_reasons.length === 0,
    blocked_reasons,
    required: [...new Set(required)],
    profile,
    threshold
  };
}

async function listPayoutReadiness({ payoutAmountCents = 0 } = {}) {
  if (!env.DATABASE_URL) {
    const rows = [];
    for (const user of users.values()) {
      const eligibility = await evaluatePayoutEligibility({ userId: user.id, payoutAmountCents });
      rows.push({
        user_id: user.id,
        user_name: user.name,
        email: user.email,
        balance: user.balance || 0,
        ...eligibility
      });
    }
    return rows;
  }

  const result = await query("SELECT id, name, email, balance_wavecoins, balance_cents FROM users ORDER BY created_at DESC LIMIT 200");
  return Promise.all(result.rows.map(async user => ({
    user_id: user.id,
    user_name: user.name,
    email: user.email,
    balance: Number((user.balance_wavecoins ?? user.balance_cents) || 0) / 100,
    balance_wavecoins: user.balance_wavecoins ?? user.balance_cents ?? 0,
    ...(await evaluatePayoutEligibility({ userId: user.id, payoutAmountCents }))
  })));
}

async function recordPrivacyConsent({ userId, consentType = "privacy", category, granted, ipAddress, userAgent }) {
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    consent_type: consentType,
    category,
    granted: Boolean(granted),
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString()
  };

  if (!COOKIE_CONSENT_CATEGORIES.includes(category)) throw new Error("Unknown consent category");

  if (!env.DATABASE_URL) {
    privacyConsentAudit.unshift(row);
    return row;
  }

  const result = await query(
    `INSERT INTO privacy_consent_audit (user_id, consent_type, category, granted, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, consentType, category, row.granted, ipAddress, userAgent]
  );
  return result.rows[0];
}

async function createDataSubjectRequest({ userId, email, requestType, message = "" }) {
  const row = {
    id: crypto.randomUUID(),
    user_id: userId || null,
    email,
    request_type: requestType,
    status: "open",
    message,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!env.DATABASE_URL) {
    dataSubjectRequests.unshift(row);
    return row;
  }

  const result = await query(
    `INSERT INTO data_subject_requests (user_id, email, request_type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId || null, email, requestType, message]
  );
  return result.rows[0];
}

module.exports = {
  COOKIE_CONSENT_CATEGORIES,
  evaluatePayoutEligibility,
  getComplianceProfile,
  getComplianceThreshold,
  listPayoutReadiness,
  recordPrivacyConsent,
  createDataSubjectRequest,
  updateComplianceProfile,
  upsertComplianceThreshold
};
