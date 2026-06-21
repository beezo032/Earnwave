const express = require("express");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const {
  buildLaunchUrl,
  normalizeCallback,
  publicProviders,
  recordOfferwallEvent,
  verifyCallbackSignature
} = require("../services/offerwalls");
const { getClientIp } = require("../services/fraud");
const { findUserById } = require("../services/users");

const offerwallRouter = express.Router();

offerwallRouter.get("/providers", (req, res) => {
  res.json({ providers: publicProviders() });
});

offerwallRouter.get("/:provider/launch", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const provider = req.params.provider.toLowerCase();
    const user = await findUserById(req.user.id);
    const launch = buildLaunchUrl(provider, {
      userId: req.user.id,
      username: user?.username,
      email: user?.email,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    res.json(launch);
  } catch (error) {
    next(error);
  }
});

async function handleCallback(req, res, next) {
  try {
    const provider = req.params.provider.toLowerCase();
    const signature = verifyCallbackSignature(provider, req);

    if (signature.reason === "Unknown provider") {
      return res.status(404).json({ message: "Unknown offerwall provider" });
    }

    const payload = req.method === "GET" ? req.query : req.body;
    const event = normalizeCallback(provider, payload);
    const recorded = await recordOfferwallEvent(event, signature);

    if (provider === "lootably") {
      return res.type("text/plain").status(recorded.rejected ? 403 : 200).send(recorded.rejected ? "0" : "1");
    }

    res.status(recorded.rejected ? 403 : 200).json({
      received: true,
      verified: signature.verified,
      event,
      message: recorded.rejected ? "Callback rejected because signature verification failed." : "Callback accepted."
    });
  } catch (error) {
    next(error);
  }
}

function combinedProviderPayload(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

function cpxPostbackRequest(req, payload) {
  return {
    ...req,
    method: req.method === "GET" ? "GET" : "POST",
    query: payload,
    body: payload
  };
}

function cpxMissingFields(event) {
  const missing = [];
  if (!event.userId) missing.push("ext_user_id/user_id");
  if (!event.transactionId) missing.push("provider_transaction_id/trans_id");
  if (!event.offerId) missing.push("offer_id/survey_id");
  if (!event.status) missing.push("status");
  if (!event.amount && event.amount_wavecoins === undefined) missing.push("amount_usd/amount_local");
  return missing;
}

async function handleCpxPostback(req, res, next) {
  try {
    const payload = combinedProviderPayload(req);
    const postbackReq = cpxPostbackRequest(req, payload);
    const signature = verifyCallbackSignature("cpx", postbackReq);
    const event = normalizeCallback("cpx", payload);
    const missing = cpxMissingFields(event);

    if (missing.length) {
      await recordOfferwallEvent(event, { verified: false, reason: `Missing required CPX postback fields: ${missing.join(", ")}` });
      return res.status(400).json({
        received: true,
        verified: false,
        accepted: false,
        message: "CPX postback missing required parameters."
      });
    }

    const recorded = await recordOfferwallEvent(event, signature);
    if (recorded.rejected) {
      return res.status(403).json({
        received: true,
        verified: false,
        accepted: false,
        message: "CPX postback rejected."
      });
    }

    res.status(200).json({
      received: true,
      verified: true,
      accepted: true,
      duplicate: Boolean(recorded.duplicate),
      event: {
        provider: event.provider,
        user_id: event.userId,
        provider_transaction_id: event.transactionId,
        offer_id: event.offerId,
        amount_usd: event.amount,
        amount_local: event.amount_wavecoins,
        status: event.status
      }
    });
  } catch (error) {
    next(error);
  }
}
offerwallRouter.get("/cpx/postback", handleCpxPostback);
offerwallRouter.post("/cpx/postback", handleCpxPostback);

offerwallRouter.get("/:provider/callback", handleCallback);
offerwallRouter.post("/:provider/callback", handleCallback);

module.exports = { offerwallRouter };
