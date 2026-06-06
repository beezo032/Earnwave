const { env } = require("../config/env");
const { query } = require("../db/postgres");
const { emailOutbox } = require("../db/demoStore");

function htmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(body) {
  const safeBody = htmlEscape(body).replace(/\n/g, "<br />");
  return `
    <div style="margin:0;background:#071015;color:#f7fbff;font-family:Inter,Arial,sans-serif;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#0d1822;border:1px solid #1d3443;border-radius:18px;padding:28px">
        <h1 style="margin:0 0 14px;font-size:24px;color:#32e6a1">EarnWave</h1>
        <p style="font-size:16px;line-height:1.6;color:#d7e2ea">${safeBody}</p>
        <p style="font-size:13px;line-height:1.5;color:#8ba0ad;margin-top:28px">If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
  `;
}

async function sendWithResend({ to, subject, body }) {
  if (!env.RESEND_API_KEY) return null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      text: body,
      html: textToHtml(body)
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Email provider rejected the message");
  }

  return payload;
}

async function deliverEmail({ to, subject, body }) {
  if ((env.EMAIL_PROVIDER || "").toLowerCase() === "resend" || env.RESEND_API_KEY) {
    const payload = await sendWithResend({ to, subject, body });
    if (payload) return { status: "sent", provider: "resend", providerId: payload.id };
  }

  return { status: "queued", provider: "local" };
}

async function queueEmail({ userId, to, subject, body }) {
  const delivery = await deliverEmail({ to, subject, body }).catch(error => ({
    status: "failed",
    provider: env.RESEND_API_KEY ? "resend" : "local",
    error: error.message
  }));

  if (!env.DATABASE_URL) {
    const row = {
      id: String(emailOutbox.length + 1),
      user_id: userId,
      to_email: to,
      subject,
      body,
      status: delivery.status,
      provider: delivery.provider,
      created_at: new Date().toISOString()
    };
    emailOutbox.unshift(row);
    return row;
  }

  const result = await query(
    "INSERT INTO email_outbox (user_id, to_email, subject, body, status, provider) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [userId || null, to, subject, body, delivery.status, delivery.provider]
  );
  return result.rows[0];
}

async function listEmailOutbox() {
  if (!env.DATABASE_URL) return emailOutbox;
  const result = await query("SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 100");
  return result.rows;
}

module.exports = { listEmailOutbox, queueEmail };
