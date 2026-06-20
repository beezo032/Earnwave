const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail, adminOnly } = require("../middleware/auth");
const { listLedgerEntries } = require("../services/ledger");
const { createTicket, listTickets, replyToTicket } = require("../services/support");
const { getAccountSecurity } = require("../services/authLifecycle");
const { listEmailOutbox, queueEmail } = require("../services/email");
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
      timezone: z.string().max(80).optional(),
      earning_interests: z.string().max(120).optional()
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
      security_alerts: z.boolean().optional(),
      preferredBalanceDisplay: z.enum(["coins", "usd", "both"]).optional()
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
      category: z.enum(["general", "offer", "missing_reward", "payout", "account", "verification", "referral", "fraud"]).default("general"),
      priority: z.enum(["low", "medium", "high"]).optional(),
      message: z.string().min(10).max(3000),
      provider: z.string().max(80).optional(),
      rewardAmount: z.string().max(80).optional(),
      completionDate: z.string().max(40).optional(),
      attachmentNames: z.array(z.string().max(180)).max(5).optional()
    }).parse(req.body);
    const details = [
      body.message,
      "",
      "Ticket details:",
      body.provider ? `Provider: ${body.provider}` : null,
      body.rewardAmount ? `Related reward: ${body.rewardAmount}` : null,
      body.completionDate ? `Completion date: ${body.completionDate}` : null,
      body.attachmentNames?.length ? `Uploaded proof files: ${body.attachmentNames.join(", ")}` : null
    ].filter(Boolean).join("\n");
    res.json({ ticket: await createTicket({ userId: req.user.id, ...body, message: details }) });
  } catch (error) {
    next(error);
  }
});

accountRouter.post("/support/tickets/:id/reply", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const body = z.object({
      message: z.string().min(2).max(3000),
      attachmentNames: z.array(z.string().max(180)).max(5).optional()
    }).parse(req.body);
    const message = [
      body.message,
      body.attachmentNames?.length ? `\nUploaded proof files: ${body.attachmentNames.join(", ")}` : null
    ].filter(Boolean).join("\n");
    const ownedTickets = await listTickets(req.user.id, false);
    if (!ownedTickets.some(ticket => String(ticket.id) === String(req.params.id))) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const ticket = await replyToTicket({ ticketId: req.params.id, senderId: req.user.id, message, status: "open", internal: false, notifyUser: false });
    await queueEmail({
      userId: req.user.id,
      to: process.env.SUPPORT_EMAIL,
      subject: `[EarnWave Support] User reply: ${ticket.subject}`,
      body: [`${req.user.email || req.user.name || "A user"} replied to support ticket ${ticket.id}.`, "", message].join("\n")
    });
    res.json({ ticket });
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
      status: z.enum(["open", "pending", "waiting_provider", "resolved", "closed", "denied"]).optional(),
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
