const express = require("express");
const { z } = require("zod");
const { requireAuth, adminOnly } = require("../middleware/auth");
const { listModerationQueue, recordModerationAction, listOffers } = require("../services/offers");
const { closeSuspiciousActivity, listSuspiciousActivity } = require("../services/fraud");
const { approveAndDispatch, listPayoutQueue, rejectPayout } = require("../services/payouts");

const adminRouter = express.Router();

adminRouter.use(requireAuth, adminOnly);

adminRouter.get("/moderation", async (req, res, next) => {
  try {
    const [queue, flags] = await Promise.all([
      listModerationQueue(),
      listSuspiciousActivity()
    ]);
    res.json({ queue, flags });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/fraud/flags", async (req, res, next) => {
  try {
    res.json({ flags: await listSuspiciousActivity() });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/payouts", async (req, res, next) => {
  try {
    res.json({ payouts: await listPayoutQueue() });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/payouts/:id/approve", async (req, res, next) => {
  try {
    const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
    res.json(await approveAndDispatch({ id: req.params.id, moderatorId: req.user.id, note: body.note }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/payouts/:id/reject", async (req, res, next) => {
  try {
    const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
    res.json(await rejectPayout({ id: req.params.id, moderatorId: req.user.id, note: body.note }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/fraud/flags/:id", async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(["closed", "false_positive", "escalated"]).default("closed")
    }).parse(req.body);
    res.json(await closeSuspiciousActivity({ id: req.params.id, status: body.status }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/moderation/:targetType/:targetId", async (req, res, next) => {
  try {
    const body = z.object({
      action: z.enum(["approved", "rejected", "held", "banned", "noted"]),
      note: z.string().max(1000).optional()
    }).parse(req.body);

    const result = await recordModerationAction({
      moderatorId: req.user.id,
      targetType: req.params.targetType,
      targetId: req.params.targetId,
      action: body.action,
      note: body.note
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/offers", async (req, res, next) => {
  try {
    res.json({ offers: await listOffers({ includeInactive: true }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/stats", async (req, res) => {
  res.json({
    users: 12450,
    pendingPayouts: 4280,
    activeOffers: 86,
    revenue: 18900,
    flaggedUsers: 37
  });
});

module.exports = { adminRouter };
