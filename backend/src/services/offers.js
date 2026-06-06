const crypto = require("crypto");
const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { offers, withdrawals, moderationEvents, suspiciousActivity, users } = require("../db/demoStore");
const { recordLedgerEntry } = require("./ledger");

function serializeOffer(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    reward: row.reward ?? Number(row.reward_cents || 0) / 100,
    category: row.category,
    provider: row.provider,
    difficulty: row.difficulty,
    time: row.time || row.estimated_time,
    active: row.active !== false
  };
}

async function listOffers({ includeInactive = false } = {}) {
  if (!env.DATABASE_URL) return offers.filter(offer => includeInactive || offer.active !== false);
  const result = await query(`SELECT * FROM offers ${includeInactive ? "" : "WHERE active = true"} ORDER BY reward_cents DESC`);
  return result.rows.map(serializeOffer);
}

async function completeOffer({ userId, offerId, risk }) {
  if (!env.DATABASE_URL) {
    const offer = offers.find(item => String(item.id) === String(offerId));
    if (!offer) throw new Error("Offer not found");
    const status = risk.score >= 50 ? "held" : "approved";
    if (status === "approved") {
      const user = users.get(String(userId));
      if (user) {
        user.balance = Number(user.balance || 0) + Number(offer.reward || 0);
        user.total_earned = Number(user.total_earned || 0) + Number(offer.reward || 0);
      }
      await recordLedgerEntry({
        userId,
        type: "offer_completion",
        direction: "credit",
        amount: offer.reward,
        referenceType: "offer",
        referenceId: offer.id,
        description: `Completed ${offer.title}`,
        metadata: { provider: offer.provider }
      });
    }
    return { status, offer, risk };
  }

  const offerResult = await query("SELECT * FROM offers WHERE id = $1 AND active = true", [offerId]);
  const offer = offerResult.rows[0];
  if (!offer) throw new Error("Offer not found");

  const status = risk.score >= 50 ? "held" : "approved";
  await query(
    "INSERT INTO offer_completions (user_id, offer_id, provider, provider_transaction_id, reward_cents, status, fraud_score, ip_address, device_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [userId, offer.id, offer.provider, crypto.randomUUID(), offer.reward_cents, status, risk.score, risk.ip, risk.deviceHash]
  );

  if (status === "approved") {
    await query("UPDATE users SET balance_cents = balance_cents + $1, total_earned_cents = total_earned_cents + $1 WHERE id = $2", [offer.reward_cents, userId]);
    await recordLedgerEntry({
      userId,
      type: "offer_completion",
      direction: "credit",
      amountCents: offer.reward_cents,
      referenceType: "offer",
      referenceId: offer.id,
      description: `Completed ${offer.title}`,
      metadata: { provider: offer.provider }
    });
  }

  return { status, offer: serializeOffer(offer), risk };
}

async function listModerationQueue() {
  if (!env.DATABASE_URL) {
    const withdrawalRows = withdrawals
      .filter(item => ["review", "held", "pending"].includes(item.status))
      .map(item => ({
        id: item.id,
        type: "withdrawal",
        user: item.user_id || "Demo User",
        reason: `Risk score ${item.risk_score || 0}`,
        amount: item.amount,
        status: item.status
      }));

    const flagRows = suspiciousActivity.map(item => ({
      id: item.id,
      type: item.event_type,
      user: item.user_id || "Demo User",
      reason: item.signals.join(", "),
      amount: 0,
      status: item.status
    }));

    return [...withdrawalRows, ...flagRows,
      { id: "demo-1", type: "withdrawal", user: "WaveHunter", reason: "Payout velocity", amount: 84.2, status: "hold" },
      { id: "demo-2", type: "completion", user: "SurveyAce", reason: "Duplicate IP", amount: 12.75, status: "review" },
      { id: "demo-3", type: "completion", user: "NovaEarns", reason: "Provider reversal", amount: 43.9, status: "reject" }
    ];
  }

  const result = await query(`
    SELECT w.id, 'withdrawal' AS type, u.name AS user, w.amount_cents, w.status, w.risk_score
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    WHERE w.status IN ('pending', 'review', 'held')
    ORDER BY w.created_at DESC
    LIMIT 100
  `);
  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    user: row.user,
    reason: `Risk score ${row.risk_score}`,
    amount: Number(row.amount_cents) / 100,
    status: row.status
  }));
}

async function recordModerationAction({ moderatorId, targetType, targetId, action, note }) {
  if (!env.DATABASE_URL) {
    moderationEvents.push({ moderatorId, targetType, targetId, action, note, created_at: new Date().toISOString() });
    return { ok: true };
  }

  await query(
    "INSERT INTO moderation_events (moderator_id, target_type, target_id, action, note) VALUES ($1, $2, $3, $4, $5)",
    [moderatorId, targetType, targetId, action, note || null]
  );

  if (targetType === "withdrawal") {
    await query("UPDATE withdrawals SET status = $1, moderator_note = $2 WHERE id = $3", [action, note || null, targetId]);
  }

  return { ok: true };
}

module.exports = { listOffers, completeOffer, listModerationQueue, recordModerationAction, serializeOffer };
