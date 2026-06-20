const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { ledgerEntries, users } = require("../db/demoStore");
const { usdDollarsToWaveCoins, waveCoinsToUsdCents } = require("./currency");

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch (_) { return {}; }
  }
  return value;
}

function serializeLedgerEntry(row) {
  const amountWaveCoins = row.amount_wavecoins ?? row.amountWaveCoins ?? (row.amount_cents !== undefined ? Number(row.amount_cents || 0) : usdDollarsToWaveCoins(row.amount));
  const metadata = parseMetadata(row.metadata);
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_email: row.user_email,
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
    release_eligible_at: metadata.release_eligible_at || row.release_eligible_at,
    balance_after: row.balance_after ?? Number(row.balance_after_cents || 0) / 100,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    description: row.description,
    metadata,
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
      user_name: user?.name,
      user_email: user?.email,
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
      .map(item => serializeLedgerEntry({ ...item, user_name: users.get(String(item.user_id))?.name, user_email: users.get(String(item.user_id))?.email }));
  }

  const result = await query(
    `SELECT l.*, u.name AS user_name, u.email AS user_email
     FROM ledger_entries l
     LEFT JOIN users u ON u.id = l.user_id
     WHERE l.provider IS NOT NULL
       AND l.provider_transaction_id IS NOT NULL
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(serializeLedgerEntry);
}

async function releaseProviderReward({ id, adminId, note = "Released by admin review" }) {
  if (!env.DATABASE_URL) {
    const entry = ledgerEntries.find(item => String(item.id) === String(id));
    if (!entry) throw new Error("Reward ledger entry not found");
    if (entry.status !== "pending" && entry.payout_status !== "pending") throw new Error(`Reward is already ${entry.status || entry.payout_status}`);
    const user = users.get(String(entry.user_id));
    if (!user) throw new Error("User not found");
    const amountWaveCoins = Number(entry.user_reward_wavecoins || entry.amount_wavecoins || 0);
    user.balance_wavecoins = Number(user.balance_wavecoins || Math.round(Number(user.balance || 0) * 100)) + amountWaveCoins;
    user.total_earned_wavecoins = Number(user.total_earned_wavecoins || Math.round(Number(user.total_earned || 0) * 100)) + amountWaveCoins;
    user.balance = user.balance_wavecoins / 100;
    user.total_earned = user.total_earned_wavecoins / 100;
    entry.status = "available";
    entry.payout_status = "available";
    entry.balance_after = user.balance;
    entry.metadata = { ...parseMetadata(entry.metadata), released_by: adminId, released_at: new Date().toISOString(), release_note: note };
    return serializeLedgerEntry(entry);
  }

  const result = await query(
    `UPDATE ledger_entries
     SET payout_status = 'available',
         metadata = metadata || $2::jsonb
     WHERE id = $1
       AND payout_status = 'pending'
       AND direction = 'credit'
     RETURNING *`,
    [id, JSON.stringify({ released_by: adminId, released_at: new Date().toISOString(), release_note: note })]
  );
  const entry = result.rows[0];
  if (!entry) throw new Error("Reward ledger entry not found or already released");
  const amountWaveCoins = Number(entry.user_reward_wavecoins || entry.amount_wavecoins || 0);
  await query(
    `UPDATE users
     SET balance_wavecoins = balance_wavecoins + $1,
         total_earned_wavecoins = total_earned_wavecoins + $1,
         balance_cents = balance_cents + $2,
         total_earned_cents = total_earned_cents + $2
     WHERE id = $3`,
    [amountWaveCoins, waveCoinsToUsdCents(amountWaveCoins), entry.user_id]
  );
  return serializeLedgerEntry(entry);
}

async function reverseProviderReward({ id, adminId, note = "Reversed by admin/provider review" }) {
  if (!env.DATABASE_URL) {
    const entry = ledgerEntries.find(item => String(item.id) === String(id));
    if (!entry) throw new Error("Reward ledger entry not found");
    const currentStatus = entry.status || entry.payout_status;
    if (currentStatus === "reversed") return serializeLedgerEntry(entry);
    const user = users.get(String(entry.user_id));
    const amountWaveCoins = Number(entry.user_reward_wavecoins || entry.amount_wavecoins || 0);
    if (user && currentStatus === "available") {
      user.balance_wavecoins = Math.max(0, Number(user.balance_wavecoins || Math.round(Number(user.balance || 0) * 100)) - amountWaveCoins);
      user.balance = user.balance_wavecoins / 100;
    }
    entry.status = "reversed";
    entry.payout_status = "reversed";
    entry.metadata = { ...parseMetadata(entry.metadata), reversed_by: adminId, reversed_at: new Date().toISOString(), reversal_note: note };
    return serializeLedgerEntry(entry);
  }

  const existing = await query("SELECT * FROM ledger_entries WHERE id = $1", [id]);
  const entry = existing.rows[0];
  if (!entry) throw new Error("Reward ledger entry not found");
  if (entry.payout_status === "reversed") return serializeLedgerEntry(entry);
  if (entry.payout_status === "available") {
    const amountWaveCoins = Number(entry.user_reward_wavecoins || entry.amount_wavecoins || 0);
    await query(
      "UPDATE users SET balance_wavecoins = GREATEST(balance_wavecoins - $1, 0), balance_cents = GREATEST(balance_cents - $2, 0) WHERE id = $3",
      [amountWaveCoins, waveCoinsToUsdCents(amountWaveCoins), entry.user_id]
    );
  }
  const result = await query(
    `UPDATE ledger_entries
     SET payout_status = 'reversed',
         metadata = metadata || $2::jsonb
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify({ reversed_by: adminId, reversed_at: new Date().toISOString(), reversal_note: note })]
  );
  return serializeLedgerEntry(result.rows[0]);
}

async function reverseProviderRewardByTransaction({ provider, providerTransactionId, adminId = null, note }) {
  if (!providerTransactionId) return null;
  if (!env.DATABASE_URL) {
    const entry = ledgerEntries.find(item => String(item.provider) === String(provider) && String(item.provider_transaction_id) === String(providerTransactionId) && item.direction === "credit");
    return entry ? reverseProviderReward({ id: entry.id, adminId, note }) : null;
  }
  const result = await query(
    "SELECT id FROM ledger_entries WHERE provider = $1 AND provider_transaction_id = $2 AND direction = 'credit' ORDER BY created_at DESC LIMIT 1",
    [provider, providerTransactionId]
  );
  return result.rows[0] ? reverseProviderReward({ id: result.rows[0].id, adminId, note }) : null;
}

module.exports = {
  cents,
  listLedgerEntries,
  listProviderRewardEconomics,
  recordLedgerEntry,
  releaseProviderReward,
  reverseProviderReward,
  reverseProviderRewardByTransaction,
  serializeLedgerEntry
};
