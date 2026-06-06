const { env } = require("../config/env");
const { query } = require("../db/postgres");
const { emailOutbox } = require("../db/demoStore");

async function queueEmail({ userId, to, subject, body }) {
  if (!env.DATABASE_URL) {
    const row = {
      id: String(emailOutbox.length + 1),
      user_id: userId,
      to_email: to,
      subject,
      body,
      status: "queued",
      provider: "local",
      created_at: new Date().toISOString()
    };
    emailOutbox.unshift(row);
    return row;
  }

  const result = await query(
    "INSERT INTO email_outbox (user_id, to_email, subject, body) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId || null, to, subject, body]
  );
  return result.rows[0];
}

async function listEmailOutbox() {
  if (!env.DATABASE_URL) return emailOutbox;
  const result = await query("SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 100");
  return result.rows;
}

module.exports = { listEmailOutbox, queueEmail };
