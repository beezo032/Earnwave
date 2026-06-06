const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail, adminOnly } = require("../middleware/auth");
const { listLedgerEntries } = require("../services/ledger");
const { createTicket, listTickets, replyToTicket } = require("../services/support");
const { getAccountSecurity } = require("../services/authLifecycle");
const { listEmailOutbox } = require("../services/email");
const { getPreferences, updatePreferences, updateProfile } = require("../services/profile");

const accountRouter = express.Router();

accountRouter.get("/transactions", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ transactions: await listLedgerEntries(req.user.id) });
  } catch (error) {
    next(error);
  }
});

accountRouter.patch("/profile", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(2).max(100),
      username: z.string().min(3).max(24),
      bio: z.string().max(280).optional(),
      country: z.string().max(80).optional(),
      timezone: z.string().max(80).optional()
    }).parse(req.body);
    res.json({ user: await updateProfile({ userId: req.user.id, ...body }) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get("/security", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ security: await getAccountSecurity(req.user.id) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get("/preferences", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ preferences: await getPreferences(req.user.id) });
  } catch (error) {
    next(error);
  }
});

accountRouter.patch("/preferences", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const body = z.object({
      marketing_opt_in: z.boolean().optional(),
      payout_alerts: z.boolean().optional(),
      security_alerts: z.boolean().optional()
    }).parse(req.body);
    res.json({ preferences: await updatePreferences({ userId: req.user.id, ...body }) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get("/support/tickets", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ tickets: await listTickets(req.user.id, req.user.role === "admin") });
  } catch (error) {
    next(error);
  }
});

accountRouter.post("/support/tickets", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const body = z.object({
      subject: z.string().min(3).max(140),
      category: z.enum(["general", "offer", "payout", "account", "fraud"]).default("general"),
      message: z.string().min(10).max(3000)
    }).parse(req.body);
    res.json({ ticket: await createTicket({ userId: req.user.id, ...body }) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get("/admin/support/tickets", requireAuth, adminOnly, async (req, res, next) => {
  try {
    res.json({ tickets: await listTickets(req.user.id, true) });
  } catch (error) {
    next(error);
  }
});

accountRouter.post("/admin/support/tickets/:id/reply", requireAuth, adminOnly, async (req, res, next) => {
  try {
    const body = z.object({
      message: z.string().min(2).max(3000),
      status: z.enum(["open", "pending", "resolved"]).optional(),
      internal: z.boolean().optional()
    }).parse(req.body);
    res.json({ ticket: await replyToTicket({ ticketId: req.params.id, senderId: req.user.id, ...body }) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get("/admin/email-outbox", requireAuth, adminOnly, async (req, res, next) => {
  try {
    res.json({ emails: await listEmailOutbox() });
  } catch (error) {
    next(error);
  }
});

module.exports = { accountRouter };
