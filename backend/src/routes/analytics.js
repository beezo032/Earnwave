const express = require("express");
const { requireAuth, adminOnly } = require("../middleware/auth");
const { platformAnalytics } = require("../services/analytics");

const analyticsRouter = express.Router();

analyticsRouter.get("/", requireAuth, adminOnly, async (req, res, next) => {
  try {
    res.json(await platformAnalytics());
  } catch (error) {
    next(error);
  }
});

module.exports = { analyticsRouter };
