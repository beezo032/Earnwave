const bcrypt = require("bcryptjs");
const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { users, createDemoUser, ledgerEntries } = require("../db/demoStore");

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
  const pendingWaveCoins = Number(user.pending_wavecoins || user.pendingWaveCoins || 0);
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
    pending_rewards: pendingWaveCoins / 100,
    balance_wavecoins: balanceWaveCoins,
    total_earned_wavecoins: totalEarnedWaveCoins,
    pending_wavecoins: pendingWaveCoins,
    pending_rewards_wavecoins: pendingWaveCoins
  };
}

function attachPendingRewards(user, pendingWaveCoins = 0) {
  return serializeUser({ ...user, pending_wavecoins: Math.max(0, Math.round(Number(pendingWaveCoins || 0))) });
}

async function pendingRewardWaveCoinsForUser(userId) {
  if (!userId) return 0;
  if (!env.DATABASE_URL) {
    return ledgerEntries
      .filter(entry => String(entry.user_id) === String(userId)
        && entry.direction === "credit"
        && String(entry.status || entry.payout_status || "").toLowerCase() === "pending")
      .reduce((sum, entry) => sum + Number(entry.user_reward_wavecoins || entry.amount_wavecoins || 0), 0);
  }

  const result = await query(
    `SELECT COALESCE(SUM(COALESCE(NULLIF(user_reward_wavecoins, 0), NULLIF(amount_wavecoins, 0), amount_cents, 0)), 0) AS pending_wavecoins
     FROM ledger_entries
     WHERE user_id = $1
       AND direction = 'credit'
       AND payout_status = 'pending'`,
    [userId]
  );
  return Number(result.rows[0]?.pending_wavecoins || 0);
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
    return attachPendingRewards(user, await pendingRewardWaveCoinsForUser(user.id));
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
    return attachPendingRewards(found, await pendingRewardWaveCoinsForUser(found.id));
  }

  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error("Invalid login details");
  }
  if (!user.email_verified && user.role !== "admin") {
    throw new Error("Verify your email before logging in.");
  }
  return attachPendingRewards(user, await pendingRewardWaveCoinsForUser(user.id));
}

async function findUserById(id) {
  if (!env.DATABASE_URL) {
    const user = users.get(String(id));
    return user ? attachPendingRewards(user, await pendingRewardWaveCoinsForUser(user.id)) : null;
  }

  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ? attachPendingRewards(result.rows[0], await pendingRewardWaveCoinsForUser(result.rows[0].id)) : null;
}

async function findUserByEmail(email) {
  if (!env.DATABASE_URL) {
    const user = [...users.values()].find(item => item.email === email);
    return user ? attachPendingRewards(user, await pendingRewardWaveCoinsForUser(user.id)) : null;
  }

  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ? attachPendingRewards(result.rows[0], await pendingRewardWaveCoinsForUser(result.rows[0].id)) : null;
}

async function listUsersForAdmin({ limit = 100, page = 1, search = "" } = {}) {
  const offset = (page - 1) * limit;
  const searchLower = search.toLowerCase();
  
  if (!env.DATABASE_URL) {
    let allUsers = [...users.values()].sort((a, b) => Number(b.id) - Number(a.id));
    
    if (searchLower) {
      allUsers = allUsers.filter(u => 
        (u.email || "").toLowerCase().includes(searchLower) ||
        (u.name || "").toLowerCase().includes(searchLower) ||
        String(u.id).includes(searchLower)
      );
    }
    
    const total = allUsers.length;
    const paginated = allUsers.slice(offset, offset + limit).map(serializeUser);
    
    return {
      users: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  let baseQuery = `FROM users`;
  const queryParams = [];
  
  if (searchLower) {
    baseQuery += ` WHERE LOWER(email) LIKE $1 OR LOWER(name) LIKE $1 OR id::text = $1`;
    queryParams.push(`%${searchLower}%`);
  }
  
  const countResult = await query(`SELECT COUNT(*) FROM users ${searchLower ? `WHERE LOWER(email) LIKE $1 OR LOWER(name) LIKE $1 OR id::text = $1` : ""}`, queryParams);
  const total = Number(countResult.rows[0].count);
  
  const result = await query(
    `SELECT id, name, username, email, role, status, email_verified, balance_wavecoins,
            total_earned_wavecoins, fraud_score, referral_code, created_at
     ${baseQuery}
     ORDER BY created_at DESC
     LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
    [...queryParams, limit, offset]
  );
  
  return {
    users: result.rows.map(serializeUser),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = { createUser, findUserByEmail, listUsersForAdmin, normalizeUsername, verifyUser, findUserById, serializeUser, pendingRewardWaveCoinsForUser };
