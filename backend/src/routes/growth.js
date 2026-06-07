const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const {
  claimDailyStreak,
  completeDailyQuest,
  getDailyQuest,
  getGrowthProfile,
  leaderboard,
  redeemBonusCode,
  weeklyLeaderboard
} = require("../services/growth");

const growthRouter = express.Router();

growthRouter.get("/me", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ growth: await getGrowthProfile(req.user.id) });
  } catch (error) {
    next(error);
  }
});

growthRouter.post("/streak/claim", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json(await claimDailyStreak(req.user.id));
  } catch (error) {
    next(error);
  }
});

growthRouter.get("/quests/daily", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ quest: await getDailyQuest(req.user.id) });
  } catch (error) {
    next(error);
  }
});

growthRouter.post("/quests/:id/complete", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    res.json(await completeDailyQuest({ userId: req.user.id, questId: params.id, req }));
  } catch (error) {
    if (/already completed/i.test(error.message)) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
});

growthRouter.post("/bonus-codes/redeem", requireAuth, requireVerifiedEmail, async (req, res, next) => {
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

growthRouter.get("/leaderboard/weekly", async (req, res, next) => {
  try {
    res.json({ leaderboard: await weeklyLeaderboard() });
  } catch (error) {
    next(error);
  }
});

module.exports = { growthRouter };
