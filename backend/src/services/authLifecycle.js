const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { env } = require("../config/env");
const { query } = require("../db/postgres");
const { authTokens, users } = require("../db/demoStore");
const { queueEmail } = require("./email");
const { findUserById, serializeUser } = require("./users");

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function expires(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function createAuthToken({ userId, type, hours = 24 }) {
  const token = makeToken();
  const expiresAt = expires(hours);

  if (!env.DATABASE_URL) {
    const row = {
      id: String(authTokens.length + 1),
      user_id: userId,
      token,
      type,
      used: false,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
    authTokens.unshift(row);
    return row;
  }

  const result = await query(
    "INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, token, type, expiresAt]
  );
  return result.rows[0];
}

async function sendVerificationEmail(user) {
  const row = await createAuthToken({ userId: user.id, type: "email_verification", hours: 48 });
  const link = `${env.PUBLIC_URL}/verify-email?token=${row.token}`;
  await queueEmail({
    userId: user.id,
    to: user.email,
    subject: "Verify your EarnWave account",
    body: `Welcome to EarnWave. Verify your email here: ${link}`
  });
  return { sent: true, previewToken: row.token, previewUrl: link };
}

async function requestPasswordReset(email) {
  const user = !env.DATABASE_URL
    ? [...users.values()].find(item => item.email === email)
    : (await query("SELECT * FROM users WHERE email = $1", [email])).rows[0];

  if (!user) return { sent: true };
  const row = await createAuthToken({ userId: user.id, type: "password_reset", hours: 2 });
  const link = `${env.PUBLIC_URL}/reset-password?token=${row.token}`;
  await queueEmail({
    userId: user.id,
    to: user.email,
    subject: "Reset your EarnWave password",
    body: `Reset your EarnWave password here: ${link}`
  });
  return { sent: true, previewToken: row.token, previewUrl: link };
}

async function consumeToken(token, type) {
  if (!env.DATABASE_URL) {
    const row = authTokens.find(item => item.token === token && item.type === type);
    if (!row || row.used || new Date(row.expires_at) < new Date()) throw new Error("Token is invalid or expired");
    row.used = true;
    return row;
  }

  const result = await query(
    "UPDATE auth_tokens SET used = true WHERE token = $1 AND type = $2 AND used = false AND expires_at > now() RETURNING *",
    [token, type]
  );
  if (!result.rows[0]) throw new Error("Token is invalid or expired");
  return result.rows[0];
}

async function verifyEmailToken(token) {
  const row = await consumeToken(token, "email_verification");
  if (!env.DATABASE_URL) {
    const user = users.get(String(row.user_id));
    if (!user) throw new Error("User not found");
    user.email_verified = true;
    return serializeUser(user);
  }

  const result = await query("UPDATE users SET email_verified = true WHERE id = $1 RETURNING *", [row.user_id]);
  return serializeUser(result.rows[0]);
}

async function resetPassword({ token, password }) {
  const row = await consumeToken(token, "password_reset");
  const passwordHash = await bcrypt.hash(password, 10);

  if (!env.DATABASE_URL) {
    const user = users.get(String(row.user_id));
    if (!user) throw new Error("User not found");
    user.password_hash = passwordHash;
    return { ok: true };
  }

  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, row.user_id]);
  return { ok: true };
}

async function getAccountSecurity(userId) {
  const user = await findUserById(userId);
  return {
    emailVerified: Boolean(user?.email_verified),
    twoFactorEnabled: false,
    payoutReviewRequired: true,
    ledgerEnabled: true,
    deviceFingerprinting: true,
    passwordResetEnabled: true
  };
}

module.exports = {
  getAccountSecurity,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmailToken
};
