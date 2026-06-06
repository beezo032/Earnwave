const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { claimDailyStreak, getGrowthProfile, leaderboard, redeemBonusCode } = require("../services/growth");

const growthRouter = express.Router();

growthRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    res.json({ growth: await getGrowthProfile(req.user.id) });
  } catch (error) {
    next(error);
  }
});

growthRouter.post("/streak/claim", requireAuth, async (req, res, next) => {
  try {
    res.json(await claimDailyStreak(req.user.id));
  } catch (error) {
    next(error);
  }
});

growthRouter.post("/bonus-codes/redeem", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().min(2).max(64) }).parse(req.body);
    res.json(await redeemBonusCode(req.user.id, body.code));
  } catch (error) {
    next(error);
  }
});

growthRouter.get("/leaderboard", async (req, res, next) => {
  try {
    res.json({ leaderboard: await leaderboard() });
  } catch (error) {
    next(error);
  }
});

module.exports = { growthRouter };
