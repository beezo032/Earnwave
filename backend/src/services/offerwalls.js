const crypto = require("crypto");
const { env } = require("../config/env");
const { paymentEvents, users } = require("../db/demoStore");
const { query } = require("../db/postgres");
const { recordLedgerEntry } = require("./ledger");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function md5(value) {
  return crypto.createHash("md5").update(String(value)).digest("hex");
}

function hmac(value, secret, algorithm = "sha256") {
  return crypto.createHmac(algorithm, secret).update(String(value)).digest("hex");
}

function replaceUser(url, userId) {
  return url.replaceAll("{userId}", encodeURIComponent(userId));
}

function payloadFrom(req) {
  return req.method === "GET" ? req.query : req.body;
}

function sortedQuery(payload, omit = ["hash", "signature", "secure_hash"]) {
  return Object.keys(payload)
    .filter(key => !omit.includes(key))
    .sort()
    .map(key => `${key}=${payload[key]}`)
    .join("&");
}

const providerAdapters = {
  cpx: {
    name: "CPX Research",
    docs: "https://cpx-research.com/main/en/doc.php",
    enabled: () => Boolean(env.CPX_APP_ID && env.CPX_SECURE_HASH_SECRET),
    launch({ userId, username, email }) {
      const params = new URLSearchParams({
        app_id: env.CPX_APP_ID,
        ext_user_id: userId,
        username: username || userId,
        email: email || "",
        subid_1: "earnwave",
        subid_2: userId
      });
      params.set("secure_hash", md5(`${userId}-${env.CPX_SECURE_HASH_SECRET}`));
      return `https://live-api.cpx-research.com/api/get-surveys.php?${params.toString()}`;
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.CPX_SECURE_HASH_SECRET) return { verified: false, reason: "CPX_SECURE_HASH_SECRET not set" };
      const received = payload.secure_hash || payload.hash;
      const expected = sha256(sortedQuery(payload) + env.CPX_SECURE_HASH_SECRET);
      return { verified: received === expected, expected };
    },
    normalize(payload) {
      return {
        provider: "cpx",
        userId: payload.ext_user_id || payload.user_id || payload.subid_2,
        transactionId: payload.trans_id || payload.transaction_id || payload.survey_id,
        offerId: payload.survey_id || payload.offer_id,
        amount: Number(payload.amount || payload.reward || payload.payout || 0),
        status: payload.status || "approved",
        raw: payload
      };
    }
  },
  adgate: {
    name: "AdGate",
    docs: "https://help.adgatemedia.com/hc/en-us/articles/360000976873-How-do-I-setup-a-postback",
    enabled: () => Boolean(env.ADGATE_WALL_URL),
    launch({ userId }) {
      return replaceUser(env.ADGATE_WALL_URL, userId);
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.ADGATE_POSTBACK_SECRET) return { verified: false, reason: "ADGATE_POSTBACK_SECRET not set" };
      const received = payload.signature || payload.hash;
      const expected = hmac(sortedQuery(payload), env.ADGATE_POSTBACK_SECRET);
      return { verified: received === expected, expected };
    },
    normalize(payload) {
      return {
        provider: "adgate",
        userId: payload.subid || payload.sub_id || payload.user_id || payload.uid,
        transactionId: payload.txid || payload.transaction_id || payload.conversion_id,
        offerId: payload.offer_id || payload.campaign_id,
        amount: Number(payload.payout || payload.reward || payload.amount || 0),
        status: payload.status === "0" ? "chargeback" : "approved",
        raw: payload
      };
    }
  },
  bitlabs: {
    name: "BitLabs",
    docs: "https://developer.bitlabs.ai/docs/callbacks",
    enabled: () => Boolean(env.BITLABS_WALL_URL && env.BITLABS_APP_SECRET),
    launch({ userId }) {
      return replaceUser(env.BITLABS_WALL_URL, userId);
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.BITLABS_APP_SECRET) return { verified: false, reason: "BITLABS_APP_SECRET not set" };
      const received = payload.hash;
      const queryWithoutHash = req.originalUrl.split("?")[1]?.replace(/(^|&)hash=[^&]*/g, "").replace(/^&/, "") || sortedQuery(payload);
      const expected = hmac(queryWithoutHash, env.BITLABS_APP_SECRET, "sha1");
      return { verified: received === expected, expected };
    },
    normalize(payload) {
      const state = payload.offer_state || payload.type || payload.state;
      return {
        provider: "bitlabs",
        userId: payload.uid || payload.user_id || payload.USER_ID,
        transactionId: payload.tx || payload.TX || payload.transaction_id,
        offerId: payload.offer_id,
        amount: Number(payload.val || payload.value || payload.currency || payload.reward || 0),
        status: String(state || "").toUpperCase() === "RECONCILED" ? "chargeback" : String(state || "").toUpperCase() === "PENDING" ? "pending" : "approved",
        raw: payload
      };
    }
  },
  lootably: {
    name: "Lootably",
    docs: "https://documentation.lootably.com/docs/postbacks",
    enabled: () => Boolean(env.LOOTABLY_WALL_URL && env.LOOTABLY_POSTBACK_SECRET),
    launch({ userId }) {
      return replaceUser(env.LOOTABLY_WALL_URL, userId);
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.LOOTABLY_POSTBACK_SECRET) return { verified: false, reason: "LOOTABLY_POSTBACK_SECRET not set" };
      const expected = sha256(`${payload.userID || ""}${payload.ip || payload.userIP || ""}${payload.revenue || ""}${payload.currencyReward || payload.reward || ""}${env.LOOTABLY_POSTBACK_SECRET}`);
      return { verified: payload.hash === expected, expected };
    },
    normalize(payload) {
      return {
        provider: "lootably",
        userId: payload.userID,
        transactionId: payload.transactionID,
        offerId: payload.offerID,
        amount: Number(payload.currencyReward || payload.reward || 0),
        status: payload.status === "0" ? "chargeback" : "approved",
        raw: payload
      };
    }
  },
  timewall: {
    name: "TimeWall",
    docs: "Configure from your TimeWall publisher dashboard",
    enabled: () => Boolean(env.TIMEWALL_WALL_URL),
    launch({ userId }) {
      return replaceUser(env.TIMEWALL_WALL_URL, userId);
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.TIMEWALL_POSTBACK_SECRET) return { verified: false, reason: "TIMEWALL_POSTBACK_SECRET not set" };
      const received = payload.signature || payload.hash;
      const expected = hmac(sortedQuery(payload), env.TIMEWALL_POSTBACK_SECRET);
      return { verified: received === expected, expected };
    },
    normalize(payload) {
      return {
        provider: "timewall",
        userId: payload.subId || payload.subid || payload.user_id || payload.uid,
        transactionId: payload.transId || payload.transaction_id || payload.txid,
        offerId: payload.offer_id || payload.offer_name,
        amount: Number(payload.reward || payload.reward_value || payload.amount || 0),
        status: payload.status === "0" ? "chargeback" : "approved",
        raw: payload
      };
    }
  },
  ayet: {
    name: "Ayet Studios",
    docs: "https://docs.ayetstudios.com/v/product-docs/offerwall/web-integrations/web-offerwall",
    enabled: () => Boolean(env.AYET_ADSLOT_ID),
    launch({ userId }) {
      const params = new URLSearchParams({
        adSlot: env.AYET_ADSLOT_ID,
        externalIdentifier: userId
      });
      return `https://offerwall.ayet.io/offers?${params.toString()}`;
    },
    verify(req) {
      const payload = payloadFrom(req);
      if (!env.AYET_POSTBACK_SECRET && !env.AYET_API_KEY) return { verified: false, reason: "AYET_POSTBACK_SECRET or AYET_API_KEY not set" };
      const secret = env.AYET_POSTBACK_SECRET || env.AYET_API_KEY;
      const received = payload.hash || payload.security_hash || payload.signature;
      const expected = hmac(sortedQuery(payload), secret);
      return { verified: received === expected, expected };
    },
    normalize(payload) {
      return {
        provider: "ayet",
        userId: payload.external_identifier || payload.externalIdentifier || payload.uid,
        transactionId: payload.transaction_id,
        offerId: payload.offer_id || payload.adslot_id,
        amount: Number(payload.currency_amount || payload.reward || payload.amount || 0),
        status: payload.status || "approved",
        raw: payload
      };
    }
  }
};

function publicProviders() {
  return Object.fromEntries(Object.entries(providerAdapters).map(([key, adapter]) => [
    key,
    {
      key,
      name: adapter.name,
      docs: adapter.docs,
      enabled: adapter.enabled(),
      callbackUrl: `/api/offerwalls/${key}/callback`
    }
  ]));
}

function buildLaunchUrl(provider, context) {
  const adapter = providerAdapters[provider];
  if (!adapter) throw new Error("Unknown offerwall provider");
  if (!adapter.enabled()) {
    return {
      configured: false,
      provider,
      name: adapter.name,
      message: `${adapter.name} is not configured. Add its env vars first.`
    };
  }
  return { configured: true, provider, name: adapter.name, url: adapter.launch(context) };
}

function verifyCallbackSignature(provider, req) {
  const adapter = providerAdapters[provider];
  if (!adapter) return { verified: false, reason: "Unknown provider" };
  return adapter.verify(req);
}

function normalizeCallback(provider, payload) {
  const adapter = providerAdapters[provider];
  if (!adapter) throw new Error("Unknown offerwall provider");
  return adapter.normalize(payload);
}

async function applyOfferwallLedgerEvent(event, signature) {
  const isReversal = ["chargeback", "rejected", "reversal", "reconciled"].includes(String(event.status).toLowerCase());
  const isCredit = ["approved", "completed", "1"].includes(String(event.status).toLowerCase());
  const amount = Number(event.amount || 0);

  if (!event.userId || !amount || (!isReversal && !isCredit)) return null;

  if (!env.DATABASE_URL) {
    const user = users.get(String(event.userId));
    if (!user) return null;
    user.balance = Number(user.balance || 0) + (isReversal ? -amount : amount);
    user.total_earned = Number(user.total_earned || 0) + (isReversal ? 0 : amount);
  } else if (isReversal) {
    await query("UPDATE users SET balance_cents = GREATEST(balance_cents - $1, 0) WHERE id = $2", [Math.round(amount * 100), event.userId]);
  } else {
    await query("UPDATE users SET balance_cents = balance_cents + $1, total_earned_cents = total_earned_cents + $1 WHERE id = $2", [Math.round(amount * 100), event.userId]);
  }

  return recordLedgerEntry({
    userId: event.userId,
    type: isReversal ? "offerwall_reversal" : "offerwall_credit",
    direction: isReversal ? "debit" : "credit",
    amount,
    referenceType: "offerwall",
    referenceId: event.transactionId,
    description: `${event.provider} ${isReversal ? "reversal" : "credit"}`,
    metadata: { offerId: event.offerId, status: event.status, verified: Boolean(signature?.verified) }
  });
}

async function recordOfferwallEvent(event, signature) {
  const row = {
    id: crypto.randomUUID(),
    provider: event.provider,
    provider_event_id: event.transactionId,
    event_type: event.status,
    payload: event.raw,
    verified: signature.verified,
    created_at: new Date().toISOString()
  };
  paymentEvents.unshift(row);
  await applyOfferwallLedgerEvent(event, signature);
  return row;
}

module.exports = {
  buildLaunchUrl,
  normalizeCallback,
  providerAdapters,
  publicProviders,
  recordOfferwallEvent,
  verifyCallbackSignature
};
