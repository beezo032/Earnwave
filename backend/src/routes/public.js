const express = require("express");
const { env } = require("../config/env");
const { query } = require("../db/postgres");
const { withdrawals, users } = require("../db/demoStore");

const publicRouter = express.Router();

function redactName(value = "EarnWave Member") {
  const [first = "Member", last = ""] = String(value).trim().split(/\s+/);
  const firstSafe = `${first.slice(0, 2)}***`;
  const lastSafe = last ? ` ${last.slice(0, 1)}.` : "";
  return `${firstSafe}${lastSafe}`;
}

function normalizeProof(row) {
  const amountWaveCoins = Math.round(Number(row.amount || row.amount_cents / 100 || 0) * 100);
  return {
    id: row.id,
    name: redactName(row.user_name || row.name),
    method: row.method,
    amountWaveCoins,
    usd: amountWaveCoins / 100,
    completedAt: row.completed_at || row.processed_at || row.approved_at || row.created_at,
    status: "completed"
  };
}

publicRouter.get("/payout-proofs", async (req, res, next) => {
  try {
    if (!env.DATABASE_URL) {
      const rows = withdrawals
        .filter(item => ["paid", "completed", "dispatched"].includes(String(item.status || "").toLowerCase()))
        .slice(0, 6)
        .map(item => normalizeProof({ ...item, user_name: users.get(String(item.user_id))?.name }));
      return res.json({ proofs: rows });
    }

    const result = await query(`
      SELECT w.id, w.method, w.amount_cents, w.status, w.processed_at, w.approved_at, w.created_at, u.name AS user_name
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      WHERE lower(w.status) IN ('paid', 'completed', 'dispatched')
      ORDER BY COALESCE(w.processed_at, w.approved_at, w.created_at) DESC
      LIMIT 6
    `);
    res.json({ proofs: result.rows.map(normalizeProof) });
  } catch (error) {
    next(error);
  }
});

module.exports = { publicRouter };
