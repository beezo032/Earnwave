const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { withdrawals, users } = require("../db/demoStore");
const { recordLedgerEntry } = require("./ledger");
const { MINIMUM_CASHOUT_WAVECOINS, usdDollarsToWaveCoins, waveCoinsToUsdCents } = require("./currency");

async function createWithdrawal({ userId, method, amount, amountWaveCoins, destinationType, destinationValue, risk }) {
  const normalizedWaveCoins = amountWaveCoins !== undefined ? Math.round(Number(amountWaveCoins || 0)) : usdDollarsToWaveCoins(amount);
  const amountCents = waveCoinsToUsdCents(normalizedWaveCoins);
  if (normalizedWaveCoins < MINIMUM_CASHOUT_WAVECOINS) throw new Error("Minimum withdrawal is 500 WaveCoins");
  const score = risk.risk_score ?? risk.score ?? 0;
  const reasonCodes = risk.reason_codes || risk.signals || [];
  const status = risk.action === "manual_review" || score >= 50 ? "held" : "review";

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    const currentBalance = user.balance_wavecoins ?? Math.round(Number(user.balance || 0) * 100);
    if (Number(currentBalance || 0) < normalizedWaveCoins) throw new Error("Insufficient balance");
    user.balance_wavecoins = currentBalance - normalizedWaveCoins;
    user.balance = user.balance_wavecoins / 100;
    const row = {
      id: String(withdrawals.length + 1),
      user_id: userId,
      method,
      amount: normalizedWaveCoins / 100,
      amount_wavecoins: normalizedWaveCoins,
      usd_value_cents: amountCents,
      status,
      risk_score: score,
      fraud_action: risk.action || "hold",
      risk_reason_codes: reasonCodes,
      destination_type: destinationType,
      destination_value: destinationValue,
      created_at: new Date().toISOString()
    };
    withdrawals.unshift(row);
    await recordLedgerEntry({
      userId,
      type: "withdrawal_request",
      direction: "debit",
      amountWaveCoins: normalizedWaveCoins,
      referenceType: "withdrawal",
      referenceId: row.id,
      description: `${method} withdrawal requested`,
      metadata: { status, destinationType }
    });
    return row;
  }

  const userResult = await query("SELECT balance_wavecoins, balance_cents FROM users WHERE id = $1", [userId]);
  if (!userResult.rows[0]) throw new Error("User not found");
  const currentBalance = userResult.rows[0].balance_wavecoins ?? userResult.rows[0].balance_cents ?? 0;
  if (Number(currentBalance || 0) < normalizedWaveCoins) throw new Error("Insufficient balance");

  await query("UPDATE users SET balance_wavecoins = balance_wavecoins - $1, balance_cents = balance_cents - $2 WHERE id = $3", [normalizedWaveCoins, amountCents, userId]);
  const result = await query(
    "INSERT INTO withdrawals (user_id, method, amount_cents, status, risk_score, fraud_action, risk_reason_codes, destination_type, destination_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [userId, method, amountCents, status, score, risk.action || "hold", reasonCodes, destinationType, destinationValue]
  );
  await recordLedgerEntry({
    userId,
    type: "withdrawal_request",
    direction: "debit",
    amountWaveCoins: normalizedWaveCoins,
    referenceType: "withdrawal",
    referenceId: result.rows[0].id,
    description: `${method} withdrawal requested`,
    metadata: { status, destinationType }
  });
  return serializeWithdrawal(result.rows[0]);
}

async function listWithdrawals(userId) {
  if (!env.DATABASE_URL) return withdrawals.filter(item => item.user_id === userId || !item.user_id);
  const result = await query("SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return result.rows.map(serializeWithdrawal);
}

function serializeWithdrawal(row) {
  return {
    id: row.id,
    method: row.method,
    amount: row.amount ?? Number(row.amount_cents || 0) / 100,
    amount_wavecoins: row.amount_wavecoins ?? row.amountWaveCoins ?? (row.amount_cents || Math.round(Number(row.amount || 0) * 100)),
    usd_value_cents: row.usd_value_cents ?? row.amount_cents,
    status: row.status,
    risk_score: row.risk_score,
    fraud_action: row.fraud_action,
    risk_reason_codes: row.risk_reason_codes || [],
    destination_type: row.destination_type,
    destination_value: row.destination_value,
    payout_provider: row.payout_provider,
    provider_reference: row.provider_reference,
    created_at: row.created_at
  };
}

module.exports = { createWithdrawal, listWithdrawals };
