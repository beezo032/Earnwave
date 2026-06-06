const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { users } = require("../db/demoStore");
const { normalizeUsername, serializeUser } = require("./users");

async function updateProfile({ userId, name, username, bio = "", country = "", timezone = "" }) {
  const normalizedUsername = normalizeUsername(username || name);
  if (normalizedUsername.length < 3) throw new Error("Username must be at least 3 characters");

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    user.name = name;
    user.username = normalizedUsername;
    user.bio = bio;
    user.country = country;
    user.timezone = timezone;
    return serializeUser(user);
  }

  const result = await query(
    "UPDATE users SET name = $1, username = $2, bio = $3, country = $4, timezone = $5 WHERE id = $6 RETURNING *",
    [name, normalizedUsername, bio, country, timezone, userId]
  );
  if (!result.rows[0]) throw new Error("User not found");
  return serializeUser(result.rows[0]);
}

async function getPreferences(userId) {
  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    return {
      marketing_opt_in: user.marketing_opt_in !== false,
      payout_alerts: user.payout_alerts !== false,
      security_alerts: user.security_alerts !== false
    };
  }

  const result = await query("SELECT marketing_opt_in, payout_alerts, security_alerts FROM users WHERE id = $1", [userId]);
  if (!result.rows[0]) throw new Error("User not found");
  return result.rows[0];
}

async function updatePreferences({ userId, marketing_opt_in, payout_alerts, security_alerts }) {
  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    if (marketing_opt_in !== undefined) user.marketing_opt_in = marketing_opt_in;
    if (payout_alerts !== undefined) user.payout_alerts = payout_alerts;
    if (security_alerts !== undefined) user.security_alerts = security_alerts;
    return getPreferences(userId);
  }

  const current = await getPreferences(userId);
  const next = {
    marketing_opt_in: marketing_opt_in ?? current.marketing_opt_in,
    payout_alerts: payout_alerts ?? current.payout_alerts,
    security_alerts: security_alerts ?? current.security_alerts
  };
  const result = await query(
    "UPDATE users SET marketing_opt_in = $1, payout_alerts = $2, security_alerts = $3 WHERE id = $4 RETURNING marketing_opt_in, payout_alerts, security_alerts",
    [next.marketing_opt_in, next.payout_alerts, next.security_alerts, userId]
  );
  return result.rows[0];
}

module.exports = { getPreferences, updatePreferences, updateProfile };
