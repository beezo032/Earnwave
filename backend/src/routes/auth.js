const express = require("express");
const { z } = require("zod");
const { createToken, requireAuth } = require("../middleware/auth");
const { createUser, verifyUser, findUserByEmail, findUserById } = require("../services/users");
const { requestPasswordReset, resetPassword, sendVerificationEmail, verifyEmailToken } = require("../services/authLifecycle");
const { buildRisk, duplicateAccountSignals, flagSuspiciousActivity, registerDevice } = require("../services/fraud");

const authRouter = express.Router();
const authSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).max(24).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().max(32).optional()
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const input = authSchema.extend({ name: z.string().min(2), username: z.string().min(3).max(24) }).parse(req.body);
    const duplicateSignals = await duplicateAccountSignals({ email: input.email, req });
    const risk = await buildRisk(req, { duplicateSignals });
    const user = await createUser(input);
    const verification = await sendVerificationEmail(user);
    await registerDevice({ userId: user.id, req });
    if (risk.score >= 35) {
      await flagSuspiciousActivity({
        userId: user.id,
        eventType: "signup_risk",
        risk,
        metadata: { email: input.email }
      });
    }
    res.status(201).json({
      ok: true,
      message: "Account created. Verify your email before logging in.",
      email: user.email,
      risk,
      verification
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body);
    const user = await verifyUser(input.email, input.password);
    const risk = await buildRisk(req);
    await registerDevice({ userId: user.id, req });
    if (risk.score >= 45) {
      await flagSuspiciousActivity({
        userId: user.id,
        eventType: "login_risk",
        risk,
        metadata: { email: input.email }
      });
    }
    const token = createToken(user);
    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.json({ token, user, risk });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.post("/verify-email/send", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    res.json({ verification: await sendVerificationEmail(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify-email/resend", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await findUserByEmail(body.email);
    if (!user || user.email_verified) return res.json({ sent: true });
    res.json({ sent: true, verification: await sendVerificationEmail(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const body = z.object({ token: z.string().min(16) }).parse(req.body);
    res.json({ user: await verifyEmailToken(body.token) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password/forgot", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    res.json(await requestPasswordReset(body.email));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password/reset", async (req, res, next) => {
  try {
    const body = z.object({ token: z.string().min(16), password: z.string().min(8) }).parse(req.body);
    res.json(await resetPassword(body));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = { authRouter };
