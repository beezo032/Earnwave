const crypto = require("crypto");
const { env } = require("../config/env");
const { query } = require("../db/postgres");
const { withdrawals, users } = require("../db/demoStore");
const { recordLedgerEntry } = require("./ledger");
const { evaluatePayoutEligibility } = require("./compliance");

function amountValue(amount) {
  return Number(amount).toFixed(2);
}

function providerForMethod(method) {
  if (method === "PayPal") return "paypal";
  if (method === "Gift Card") return "tremendous";
  if (method === "Crypto") return "circle";
  return "manual";
}

async function paypalAccessToken() {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return null;
  const base = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const token = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Unable to authenticate PayPal");
  return { base, accessToken: payload.access_token };
}

async function sendPayPalPayout(withdrawal) {
  const auth = await paypalAccessToken();
  if (!auth) {
    return { configured: false, provider: "paypal", message: "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to enable PayPal Payouts." };
  }

  const idempotencyKey = `withdrawal-${withdrawal.id}`;
  const response = await fetch(`${auth.base}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": idempotencyKey
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: idempotencyKey,
        email_subject: "Your EarnWave payout is on the way",
        email_message: "EarnWave has sent your approved payout."
      },
      items: [{
        recipient_type: "EMAIL",
        receiver: withdrawal.destination_value,
        sender_item_id: idempotencyKey,
        amount: { value: amountValue(withdrawal.amount), currency: "USD" },
        note: "EarnWave reward payout"
      }]
    })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || payload.name || "PayPal payout failed");
  return { configured: true, provider: "paypal", reference: payload.batch_header?.payout_batch_id, raw: payload };
}

async function sendTremendousReward(withdrawal) {
  if (!env.TREMENDOUS_API_KEY || !env.TREMENDOUS_FUNDING_SOURCE_ID || !env.TREMENDOUS_PRODUCT_ID) {
    return {
      configured: false,
      provider: "tremendous",
      message: "Set TREMENDOUS_API_KEY, TREMENDOUS_FUNDING_SOURCE_ID, and TREMENDOUS_PRODUCT_ID to enable gift card payouts."
    };
  }

  const base = env.TREMENDOUS_ENV === "production" ? "https://api.tremendous.com" : "https://testflight.tremendous.com";
  const idempotencyKey = `withdrawal-${withdrawal.id}`;
  const response = await fetch(`${base}/api/v2/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TREMENDOUS_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({
      external_id: idempotencyKey,
      payment: { funding_source_id: env.TREMENDOUS_FUNDING_SOURCE_ID },
      rewards: [{
        value: { denomination: Number(withdrawal.amount), currency_code: "USD" },
        delivery: { method: "EMAIL" },
        recipient: {
          name: withdrawal.recipient_name || "EarnWave Member",
          email: withdrawal.destination_value
        },
        products: [env.TREMENDOUS_PRODUCT_ID]
      }]
    })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || payload.errors?.[0]?.message || "Tremendous reward order failed");
  return { configured: true, provider: "tremendous", reference: payload.order?.id || payload.id, raw: payload };
}

async function sendCryptoPayout(withdrawal) {
  if (!env.CIRCLE_API_KEY || !env.CIRCLE_WALLET_ID) {
    return { configured: false, provider: "circle", message: "Set CIRCLE_API_KEY and CIRCLE_WALLET_ID to enable crypto withdrawals." };
  }

  const base = env.CIRCLE_ENV === "production" ? "https://api.circle.com" : "https://api-sandbox.circle.com";
  const response = await fetch(`${base}/v1/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      idempotencyKey: `withdrawal-${withdrawal.id}`,
      source: { type: "wallet", id: env.CIRCLE_WALLET_ID },
      destination: {
        type: "blockchain",
        address: withdrawal.destination_value,
        chain: withdrawal.destination_type || "ETH"
      },
      amount: { amount: amountValue(withdrawal.amount), currency: "USD" }
    })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Crypto payout failed");
  return { configured: true, provider: "circle", reference: payload.data?.id || payload.id, raw: payload };
}

async function dispatchPayout(withdrawal) {
  const provider = providerForMethod(withdrawal.method);
  if (provider === "paypal") return sendPayPalPayout(withdrawal);
  if (provider === "tremendous") return sendTremendousReward(withdrawal);
  if (provider === "circle") return sendCryptoPayout(withdrawal);
  return { configured: false, provider: "manual", message: "No automated provider for this payout method." };
}

async function listPayoutQueue() {
  if (!env.DATABASE_URL) {
    return withdrawals.filter(item => ["review", "held", "approved", "processing"].includes(item.status));
  }

  const result = await query(`
    SELECT w.*, u.name AS user_name, u.email AS user_email
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    WHERE w.status IN ('review', 'held', 'approved', 'processing')
    ORDER BY w.created_at DESC
  `);
  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_email: row.user_email,
    method: row.method,
    amount: Number(row.amount_cents || 0) / 100,
    amount_wavecoins: row.amount_wavecoins ?? row.amount_cents ?? 0,
    usd_value_cents: row.usd_value_cents ?? row.amount_cents ?? 0,
    status: row.status,
    risk_score: row.risk_score,
    fraud_action: row.fraud_action,
    risk_reason_codes: row.risk_reason_codes || [],
    destination_type: row.destination_type,
    destination_value: row.destination_value,
    payout_provider: row.payout_provider,
    provider_reference: row.provider_reference,
    created_at: row.created_at
  }));
}

async function updateWithdrawalStatus({ id, status, moderatorId, note, provider, reference }) {
  if (!env.DATABASE_URL) {
    const row = withdrawals.find(item => String(item.id) === String(id));
    if (!row) throw new Error("Withdrawal not found");
    row.status = status;
    row.moderator_note = note;
    row.approved_by = moderatorId;
    row.payout_provider = provider || row.payout_provider;
    row.provider_reference = reference || row.provider_reference;
    row.processed_at = status === "paid" ? new Date().toISOString() : row.processed_at;
    return row;
  }

  const result = await query(
    `UPDATE withdrawals
     SET status = $1,
         moderator_note = COALESCE($2, moderator_note),
         approved_by = COALESCE($3, approved_by),
         approved_at = CASE WHEN $1 IN ('approved', 'processing', 'paid') THEN COALESCE(approved_at, now()) ELSE approved_at END,
         processed_at = CASE WHEN $1 = 'paid' THEN now() ELSE processed_at END,
         payout_provider = COALESCE($4, payout_provider),
         provider_reference = COALESCE($5, provider_reference)
     WHERE id = $6
     RETURNING *`,
    [status, note || null, moderatorId || null, provider || null, reference || null, id]
  );
  if (!result.rows[0]) throw new Error("Withdrawal not found");
  const row = result.rows[0];
  return { ...row, amount: Number(row.amount_cents || 0) / 100 };
}

async function approveAndDispatch({ id, moderatorId, note }) {
  const queue = await listPayoutQueue();
  const withdrawal = queue.find(item => String(item.id) === String(id));
  if (!withdrawal) throw new Error("Withdrawal not found in manual review queue");
  if (!["review", "held"].includes(withdrawal.status)) {
    const error = new Error(`Withdrawal is already ${withdrawal.status} and cannot be approved again.`);
    error.status = 409;
    throw error;
  }
  const compliance = await evaluatePayoutEligibility({
    userId: withdrawal.user_id,
    payoutAmountCents: Math.round(Number(withdrawal.amount || 0) * 100)
  });
  if (!compliance.can_pay) {
    const error = new Error(`Payout blocked: ${compliance.blocked_reasons.join(", ")}`);
    error.status = 423;
    error.compliance = compliance;
    throw error;
  }

  await updateWithdrawalStatus({ id, status: "processing", moderatorId, note });
  const payout = await dispatchPayout(withdrawal);

  if (!payout.configured) {
    const updated = await updateWithdrawalStatus({
      id,
      status: "approved",
      moderatorId,
      note: payout.message,
      provider: payout.provider
    });
    return { withdrawal: updated, payout, message: "Approved, waiting for provider credentials before automated payout." };
  }

  const updated = await updateWithdrawalStatus({
    id,
    status: "paid",
    moderatorId,
    note,
    provider: payout.provider,
    reference: payout.reference
  });
  return { withdrawal: updated, payout, message: "Payout dispatched." };
}

async function rejectPayout({ id, moderatorId, note }) {
  const queue = await listPayoutQueue();
  const queued = queue.find(item => String(item.id) === String(id));
  const withdrawal = await updateWithdrawalStatus({ id, status: "rejected", moderatorId, note });

  if (queued) {
    if (!env.DATABASE_URL) {
      const user = users.get(String(queued.user_id));
      if (user) {
        const returnedWaveCoins = queued.amount_wavecoins ?? Math.round(Number(queued.amount || 0) * 100);
        user.balance_wavecoins = Number(user.balance_wavecoins || Math.round(Number(user.balance || 0) * 100)) + returnedWaveCoins;
        user.balance = user.balance_wavecoins / 100;
      }
    } else {
      const returnedWaveCoins = queued.amount_wavecoins ?? Math.round(Number(queued.amount || 0) * 100);
      await query("UPDATE users SET balance_wavecoins = balance_wavecoins + $1, balance_cents = balance_cents + $1 WHERE id = $2", [returnedWaveCoins, queued.user_id]);
    }

    await recordLedgerEntry({
      userId: queued.user_id,
      type: "withdrawal_reversal",
      direction: "credit",
      amountWaveCoins: queued.amount_wavecoins ?? Math.round(Number(queued.amount || 0) * 100),
      referenceType: "withdrawal",
      referenceId: queued.id,
      description: "Withdrawal rejected and funds returned",
      metadata: { note }
    });
  }

  return { withdrawal, message: "Withdrawal rejected." };
}

module.exports = {
  approveAndDispatch,
  dispatchPayout,
  listPayoutQueue,
  providerForMethod,
  rejectPayout,
  sendTremendousReward
};
