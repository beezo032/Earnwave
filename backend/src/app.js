const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const csurf = require("csurf");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const { env } = require("./config/env");
const { redisStore } = require("./cache/redis");
const { authRouter } = require("./routes/auth");
const { offerRouter } = require("./routes/offers");
const { walletRouter } = require("./routes/wallet");
const { adminRouter } = require("./routes/admin");
const { paymentRouter } = require("./routes/payments");
const { offerwallRouter } = require("./routes/offerwalls");
const { analyticsRouter } = require("./routes/analytics");
const { growthRouter } = require("./routes/growth");
const { accountRouter } = require("./routes/account");
const { legalRouter } = require("./routes/legal");
const { complianceRouter } = require("./routes/compliance");
const { publicRouter } = require("./routes/public");
const { readiness } = require("./services/readiness");
const { notFound, errorHandler } = require("./middleware/errors");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.cpx-research.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://cdn.cpx-research.com", "https://offers.cpx-research.com"],
        connectSrc: ["'self'", "https://live-api.cpx-research.com", "https://offers.cpx-research.com", "https://wall.cpx-research.com"],
        frameSrc: ["'self'", "https://offers.cpx-research.com", "https://wall.cpx-research.com", "https://click.cpx-research.com", "https://theoremreach.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
  app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(session({
    store: redisStore(),
    secret: env.SESSION_SECRET,
    name: "earnwave.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));
  const csrfProtection = csurf({
    cookie: false,
    value: req => req.headers["x-csrf-token"] || req.headers["x-xsrf-token"]
  });
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  const csrfExemptPaths = [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/password/forgot",
    "/api/auth/password/reset",
    "/api/auth/verify-email",
    "/api/auth/verify-email/resend",
    "/api/payments/stripe/webhook",
    "/api/offerwalls/"
  ];
  app.use((req, res, next) => {
    if (req.headers.authorization?.startsWith("Bearer ")) {
      return next();
    }
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || csrfExemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, redis: Boolean(redisStore()), database: env.DATABASE_URL ? "postgres" : "demo", readiness: readiness() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/offers", offerRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/offerwalls", offerwallRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/growth", growthRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/legal", legalRouter);
  app.use("/api/compliance", complianceRouter);
  app.use("/api/public", publicRouter);

  app.use(express.static(env.STATIC_DIR));
  app.get(["/", "/offers", "/surveys", "/how-it-works", "/trust", "/dashboard", "/wallet", "/referrals", "/leaderboard", "/settings", "/admin", "/analytics", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/profile", "/support", "/legal"], (req, res) => {
    res.sendFile(path.join(env.STATIC_DIR, "index.html"));
  });
  app.get(["/offers.html", "/dashboard.html", "/wallet.html", "/admin.html", "/login.html", "/signup.html"], (req, res) => {
    res.redirect(req.path.replace(".html", ""));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
