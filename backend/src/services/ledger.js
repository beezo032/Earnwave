const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { ledgerEntries, users } = require("../db/demoStore");
const { usdDollarsToWaveCoins, waveCoinsToUsdCents } = require("./currency");

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function serializeLedgerEntry(row) {
  const amountWaveCoins = row.amount_wavecoins ?? row.amountWaveCoins ?? (row.amount_cents !== undefined ? Number(row.amount_cents || 0) : usdDollarsToWaveCoins(row.amount));
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    direction: row.direction,
    amount: row.amount ?? amountWaveCoins / 100,
    amount_wavecoins: amountWaveCoins,
    usd_value_cents: row.usd_value_cents ?? waveCoinsToUsdCents(amountWaveCoins),
    provider_gross_usd_cents: row.provider_gross_usd_cents ?? row.providerGrossUsdCents ?? 0,
    user_reward_wavecoins: row.user_reward_wavecoins ?? row.userRewardWaveCoins ?? amountWaveCoins,
    platform_margin_usd_cents: row.platform_margin_usd_cents ?? row.platformMarginUsdCents ?? 0,
    provider: row.provider,
    provider_transaction_id: row.provider_transaction_id,
    status: row.payout_status || row.status || (row.direction === "credit" ? "available" : "paid"),
    balance_after: row.balance_after ?? Number(row.balance_after_cents || 0) / 100,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    description: row.description,
    metadata: row.metadata || {},
    created_at: row.created_at
  };
}

async function recordLedgerEntry({ userId, type, direction, amount, amountCents, amountWaveCoins, providerGrossUsdCents = 0, userRewardWaveCoins, platformMarginUsdCents = 0, provider, providerTransactionId, status, referenceType, referenceId, description, metadata = {} }) {
  const normalizedWaveCoins = amountWaveCoins !== undefined
    ? Number(amountWaveCoins || 0)
    : amountCents !== undefined ? Number(amountCents || 0) : usdDollarsToWaveCoins(amount);
  const normalizedAmountCents = waveCoinsToUsdCents(normalizedWaveCoins);
  const normalizedGrossUsdCents = Math.max(0, Math.round(Number(providerGrossUsdCents || 0)));
  const normalizedUserRewardWaveCoins = Math.max(0, Math.round(Number(userRewardWaveCoins ?? normalizedWaveCoins)));
  const normalizedPlatformMarginUsdCents = Math.max(0, Math.round(Number(platformMarginUsdCents || 0)));

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    const balanceAfter = user ? Number(user.balance || 0) : 0;
    const row = {
      id: String(ledgerEntries.length + 1),
      user_id: userId,
      type,
      direction,
      amount: normalizedWaveCoins / 100,
      amount_wavecoins: normalizedWaveCoins,
      usd_value_cents: normalizedAmountCents,
      provider_gross_usd_cents: normalizedGrossUsdCents,
      user_reward_wavecoins: normalizedUserRewardWaveCoins,
      platform_margin_usd_cents: normalizedPlatformMarginUsdCents,
      provider,
      provider_transaction_id: providerTransactionId,
      status: status || (direction === "credit" ? "available" : "paid"),
      balance_after: balanceAfter,
      reference_type: referenceType,
      reference_id: referenceId,
      description,
      metadata,
      created_at: new Date().toISOString()
    };
    ledgerEntries.unshift(row);
    return row;
  }

  const balanceResult = await query("SELECT balance_wavecoins, balance_cents FROM users WHERE id = $1", [userId]);
  const balanceAfter = balanceResult.rows[0]?.balance_wavecoins ?? balanceResult.rows[0]?.balance_cents ?? 0;
  const result = await query(
    `INSERT INTO ledger_entries
      (user_id, type, direction, amount_cents, amount_wavecoins, usd_value_cents, provider_gross_usd_cents, user_reward_wavecoins, platform_margin_usd_cents, provider, provider_transaction_id, payout_status, balance_after_cents, reference_type, reference_id, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [userId, type, direction, normalizedAmountCents, normalizedWaveCoins, normalizedAmountCents, normalizedGrossUsdCents, normalizedUserRewardWaveCoins, normalizedPlatformMarginUsdCents, provider || null, providerTransactionId || null, status || (direction === "credit" ? "available" : "paid"), balanceAfter, referenceType || null, referenceId || null, description, JSON.stringify(metadata)]
  );
  return serializeLedgerEntry(result.rows[0]);
}

async function listLedgerEntries(userId) {
  if (!env.DATABASE_URL) {
    return ledgerEntries.filter(item => String(item.user_id) === String(userId)).map(serializeLedgerEntry);
  }

  const result = await query("SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]);
  return result.rows.map(serializeLedgerEntry);
}

async function listProviderRewardEconomics({ limit = 50 } = {}) {
  if (!env.DATABASE_URL) {
    return ledgerEntries
      .filter(item => item.provider && item.provider_transaction_id)
      .slice(0, limit)
      .map(serializeLedgerEntry);
  }

  const result = await query(
    `SELECT * FROM ledger_entries
     WHERE provider IS NOT NULL
       AND provider_transaction_id IS NOT NULL
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(serializeLedgerEntry);
}

module.exports = { cents, listLedgerEntries, listProviderRewardEconomics, recordLedgerEntry, serializeLedgerEntry };
