const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { findUserById } = require("../services/users");

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

async function requireVerifiedEmail(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(401).json({ message: "Authentication required" });
    if (user.role === "admin" || user.email_verified) {
      req.account = user;
      return next();
    }
    return res.status(403).json({ message: "Verify your email before accessing your account." });
  } catch (error) {
    next(error);
  }
}

module.exports = { createToken, requireAuth, requireVerifiedEmail, adminOnly };
