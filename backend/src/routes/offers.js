const express = require("express");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const { listOffers, completeOffer } = require("../services/offers");
const { cacheGet, cacheSet } = require("../cache/redis");
const { buildRisk, flagSuspiciousActivity } = require("../services/fraud");

const offerRouter = express.Router();

offerRouter.get("/public", async (req, res, next) => {
  try {
    const cached = await cacheGet("public_offers");
    if (cached) return res.json({ offers: cached, cached: true });

    const offers = await listOffers();
    await cacheSet("public_offers", offers, 120);
    res.json({ offers });
  } catch (error) {
    next(error);
  }
});

offerRouter.get("/", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ offers: await listOffers() });
  } catch (error) {
    next(error);
  }
});

offerRouter.post("/:id/complete", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const risk = await buildRisk(req, { highValue: true });
    const completion = await completeOffer({ userId: req.user.id, offerId: req.params.id, risk });
    if (risk.score >= 45 || completion.status === "held") {
      await flagSuspiciousActivity({
        userId: req.user.id,
        eventType: "offer_completion_risk",
        risk,
        metadata: { offerId: req.params.id, status: completion.status }
      });
    }
    res.json(completion);
  } catch (error) {
    next(error);
  }
});

module.exports = { offerRouter };
