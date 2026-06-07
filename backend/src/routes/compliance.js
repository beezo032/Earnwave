const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const { getClientIp } = require("../services/fraud");
const {
  COOKIE_CONSENT_CATEGORIES,
  createDataSubjectRequest,
  evaluatePayoutEligibility,
  getComplianceProfile,
  recordPrivacyConsent,
  updateComplianceProfile
} = require("../services/compliance");

const complianceRouter = express.Router();

const profileSchema = z.object({
  country: z.string().min(2).max(2).optional(),
  kycStatus: z.enum(["not_started", "pending", "verified", "rejected"]).optional(),
  w9Status: z.enum(["not_started", "requested", "collected", "rejected"]).optional(),
  w8Status: z.enum(["not_started", "requested", "collected", "rejected"]).optional()
});

complianceRouter.get("/profile", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const profile = await getComplianceProfile(req.user.id);
    const eligibility = await evaluatePayoutEligibility({ userId: req.user.id, payoutAmountCents: 0 });
    res.json({ profile, eligibility, cookieConsentCategories: COOKIE_CONSENT_CATEGORIES });
  } catch (error) {
    next(error);
  }
});

complianceRouter.put("/profile", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    res.json({
      profile: await updateComplianceProfile({
        userId: req.user.id,
        country: body.country,
        kycStatus: body.kycStatus,
        w9Status: body.w9Status,
        w8Status: body.w8Status
      })
    });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/privacy-consent", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      consentType: z.string().max(60).default("privacy"),
      category: z.enum(COOKIE_CONSENT_CATEGORIES),
      granted: z.boolean()
    }).parse(req.body);
    res.status(201).json({
      consent: await recordPrivacyConsent({
        userId: req.user.id,
        consentType: body.consentType,
        category: body.category,
        granted: body.granted,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || ""
      })
    });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/data-subject-requests", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      requestType: z.enum(["access", "delete", "correct", "export", "opt_out"]),
      message: z.string().max(2000).optional()
    }).parse(req.body);
    res.status(201).json({
      request: await createDataSubjectRequest({
        userId: req.user?.id,
        email: body.email,
        requestType: body.requestType,
        message: body.message || ""
      })
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { complianceRouter };
