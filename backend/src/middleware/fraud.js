const { buildRisk, getClientIp } = require("../services/fraud");

async function scoreRequest(req, extra = {}) {
  return buildRisk(req, extra);
}

function fraudGate(threshold = 80) {
  return async (req, res, next) => {
    const risk = await scoreRequest(req);
    req.risk = risk;
    if (risk.score >= threshold) {
      return res.status(403).json({ message: "Request held for fraud review", risk });
    }
    next();
  };
}

module.exports = { scoreRequest, fraudGate, getClientIp };
