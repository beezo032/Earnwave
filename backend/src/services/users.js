const bcrypt = require("bcryptjs");
const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { users, createDemoUser } = require("../db/demoStore");

function makeReferralCode(name = "EW") {
  const base = name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "WAVE";
  return `${base}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeUsername(value = "") {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

function serializeUser(user) {
  const balanceWaveCoins = user.balance_wavecoins ?? user.balanceWaveCoins ?? (user.balance_cents !== undefined ? Number(user.balance_cents || 0) : Math.round(Number(user.balance || 0) * 100));
  const totalEarnedWaveCoins = user.total_earned_wavecoins ?? user.totalEarnedWaveCoins ?? (user.total_earned_cents !== undefined ? Number(user.total_earned_cents || 0) : Math.round(Number(user.total_earned || 0) * 100));
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status || "active",
    email_verified: Boolean(user.email_verified),
    marketing_opt_in: user.marketing_opt_in !== false,
    payout_alerts: user.payout_alerts !== false,
    security_alerts: user.security_alerts !== false,
    preferredBalanceDisplay: user.preferredBalanceDisplay || user.preferred_balance_display || "coins",
    bio: user.bio || "",
    country: user.country || "",
    timezone: user.timezone || "",
    earning_interests: user.earning_interests || user.earningInterests || "",
    fraud_score: user.fraud_score || 0,
    referral_code: user.referral_code,
    referred_by: user.referred_by,
    level: user.level || Math.max(1, Math.floor((totalEarnedWaveCoins / 100) / 50) + 1),
    xp: user.xp || 0,
    streak_count: user.streak_count || 0,
    last_streak_at: user.last_streak_at,
    balance: balanceWaveCoins / 100,
    total_earned: totalEarnedWaveCoins / 100,
    balance_wavecoins: balanceWaveCoins,
    total_earned_wavecoins: totalEarnedWaveCoins
  };
}

async function createUser({ name, username: rawUsername, email, password, referralCode }) {
  const username = normalizeUsername(rawUsername || name);
  if (username.length < 3) throw new Error("Username must be at least 3 characters");

  if (!env.DATABASE_URL) {
    const user = await createDemoUser({ name, email, password, role: "user" });
    user.username = username;
    user.referral_code = user.referral_code || makeReferralCode(name);
    if (referralCode) {
      const referrer = [...users.values()].find(item => item.referral_code === referralCode);
      if (referrer) user.referred_by = referrer.id;
    }
    return serializeUser(user);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const referrer = referralCode
    ? await query("SELECT id FROM users WHERE referral_code = $1", [referralCode])
    : { rows: [] };
  const result = await query(
    "INSERT INTO users (name, username, email, password_hash, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [name, username, email, passwordHash, makeReferralCode(name), referrer.rows[0]?.id || null]
  );

  if (referrer.rows[0]?.id) {
    await query("INSERT INTO referrals (referrer_id, referred_user_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING", [referrer.rows[0].id, result.rows[0].id]);
  }

  return serializeUser(result.rows[0]);
}

async function verifyUser(email, password) {
  if (!env.DATABASE_URL) {
    const found = [...users.values()].find(user => user.email === email) || await createDemoUser({ name: "EarnWave User", email, password, role: "user" });
    const valid = await bcrypt.compare(password, found.password_hash);
    if (!valid) throw new Error("Invalid login details");
    if (!found.email_verified && found.role !== "admin") throw new Error("Verify your email before logging in.");
    return serializeUser(found);
  }

  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error("Invalid login details");
  }
  if (!user.email_verified && user.role !== "admin") {
    throw new Error("Verify your email before logging in.");
  }
  return serializeUser(user);
}

async function findUserById(id) {
  if (!env.DATABASE_URL) {
    const user = users.get(String(id));
    return user ? serializeUser(user) : null;
  }

  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ? serializeUser(result.rows[0]) : null;
}

async function findUserByEmail(email) {
  if (!env.DATABASE_URL) {
    const user = [...users.values()].find(item => item.email === email);
    return user ? serializeUser(user) : null;
  }

  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ? serializeUser(result.rows[0]) : null;
}

async function listUsersForAdmin({ limit = 100 } = {}) {
  if (!env.DATABASE_URL) {
    return [...users.values()]
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, limit)
      .map(serializeUser);
  }

  const result = await query(
    `SELECT id, name, username, email, role, status, email_verified, balance_wavecoins,
            total_earned_wavecoins, fraud_score, referral_code, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(serializeUser);
}

module.exports = { createUser, findUserByEmail, listUsersForAdmin, normalizeUsername, verifyUser, findUserById, serializeUser };
