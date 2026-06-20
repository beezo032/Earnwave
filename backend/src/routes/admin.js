const express = require("express");
const { z } = require("zod");
const { requireAuth, adminOnly } = require("../middleware/auth");
const { listModerationQueue, recordModerationAction, listOffers } = require("../services/offers");
const { closeSuspiciousActivity, listSuspiciousActivity } = require("../services/fraud");
const { approveAndDispatch, listPayoutQueue, rejectPayout } = require("../services/payouts");
const { REASON_CODE_CATALOG } = require("../services/fraud");
const { listProviderRewardEconomics, releaseProviderReward, reverseProviderReward } = require("../services/ledger");
const { listOfferwallCallbackEvents } = require("../services/offerwalls");
const { listUsersForAdmin } = require("../services/users");
const {
  getComplianceThreshold,
  listPayoutReadiness,
  updateComplianceProfile,
  upsertComplianceThreshold
} = require("../services/compliance");

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

adminRouter.get("/fraud/reason-codes", (req, res) => {
  res.json({ reasonCodes: REASON_CODE_CATALOG });
});

adminRouter.get("/compliance/thresholds/:country", async (req, res, next) => {
  try {
    res.json({ threshold: await getComplianceThreshold(req.params.country) });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/compliance/thresholds/:country", async (req, res, next) => {
  try {
    const body = z.object({
      kycThresholdCents: z.coerce.number().int().min(0),
      taxThresholdCents: z.coerce.number().int().min(0),
      requiredTaxForm: z.enum(["W-9", "W-8"]).optional()
    }).parse(req.body);
    res.json({
      threshold: await upsertComplianceThreshold({
        country: req.params.country,
        kycThresholdCents: body.kycThresholdCents,
        taxThresholdCents: body.taxThresholdCents,
        requiredTaxForm: body.requiredTaxForm,
        adminId: req.user.id
      })
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/compliance/users/:userId", async (req, res, next) => {
  try {
    const body = z.object({
      country: z.string().min(2).max(2).optional(),
      kycStatus: z.enum(["not_started", "pending", "verified", "rejected"]).optional(),
      w9Status: z.enum(["not_started", "requested", "collected", "rejected"]).optional(),
      w8Status: z.enum(["not_started", "requested", "collected", "rejected"]).optional(),
      payoutLocked: z.boolean().optional(),
      lockReason: z.string().max(500).optional()
    }).parse(req.body);
    res.json({
      profile: await updateComplianceProfile({
        userId: req.params.userId,
        country: body.country,
        kycStatus: body.kycStatus,
        w9Status: body.w9Status,
        w8Status: body.w8Status,
        payoutLocked: body.payoutLocked,
        lockReason: body.lockReason
      })
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/compliance/payout-readiness", async (req, res, next) => {
  try {
    res.json({
      users: await listPayoutReadiness({ payoutAmountCents: Number(req.query.amountCents || 0) })
    });
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

adminRouter.get("/users", async (req, res, next) => {
  try {
    res.json({ users: await listUsersForAdmin({ limit: Number(req.query.limit || 100) }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/offerwall-economics", async (req, res, next) => {
  try {
    res.json({ entries: await listProviderRewardEconomics({ limit: Number(req.query.limit || 50) }) });
  } catch (error) {
    next(error);
  }
});


adminRouter.post("/provider-rewards/:id/release", async (req, res, next) => {
  try {
    const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
    res.json({ reward: await releaseProviderReward({ id: req.params.id, adminId: req.user.id, note: body.note }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/provider-rewards/:id/reverse", async (req, res, next) => {
  try {
    const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
    res.json({ reward: await reverseProviderReward({ id: req.params.id, adminId: req.user.id, note: body.note }) });
  } catch (error) {
    next(error);
  }
});
adminRouter.get("/offerwall-callbacks", async (req, res, next) => {
  try {
    res.json({ callbacks: await listOfferwallCallbackEvents({ limit: Number(req.query.limit || 50) }) });
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
