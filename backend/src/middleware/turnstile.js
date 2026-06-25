const { env } = require("../config/env");

async function verifyTurnstile(req, res, next) {
  // Skip if not configured or explicitly disabled
  if (!env.TURNSTILE_SECRET_KEY || req.app.locals.disableTurnstileForTesting) {
    return next();
  }

  const token = req.body?.turnstileToken || req.headers["x-turnstile-token"];

  if (!token) {
    return res.status(400).json({ 
      message: "Bot protection check failed. Please refresh the page and try again.", 
      code: "MISSING_TURNSTILE_TOKEN" 
    });
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: req.ip
      })
    });

    const data = await response.json();

    if (data.success) {
      return next();
    }

    return res.status(400).json({
      message: "Security check failed. Please refresh and try again.",
      code: "INVALID_TURNSTILE_TOKEN",
      details: data["error-codes"]
    });
  } catch (error) {
    console.error("Turnstile verification error:", error);
    // Fail open if Cloudflare is unreachable to not block real users, or fail closed?
    // Let's fail closed for security, but return a generic error.
    return res.status(500).json({ message: "Security verification service temporarily unavailable." });
  }
}

module.exports = { verifyTurnstile };
