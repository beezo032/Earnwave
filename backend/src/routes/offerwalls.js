const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  buildLaunchUrl,
  normalizeCallback,
  publicProviders,
  recordOfferwallEvent,
  verifyCallbackSignature
} = require("../services/offerwalls");
const { getClientIp } = require("../services/fraud");

const offerwallRouter = express.Router();

offerwallRouter.get("/providers", (req, res) => {
  res.json({ providers: publicProviders() });
});

offerwallRouter.get("/:provider/launch", requireAuth, (req, res, next) => {
  try {
    const provider = req.params.provider.toLowerCase();
    const launch = buildLaunchUrl(provider, {
      userId: req.user.id,
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
  await recordOfferwallEvent(event, signature);

  if (provider === "lootably") {
    return res.type("text/plain").send("1");
  }

  res.json({
    received: true,
    verified: signature.verified,
    event,
    message: signature.verified ? "Callback accepted." : "Callback received in unverified/dev mode."
  });
  } catch (error) {
    next(error);
  }
}

offerwallRouter.get("/:provider/callback", handleCallback);
offerwallRouter.post("/:provider/callback", handleCallback);

module.exports = { offerwallRouter };
