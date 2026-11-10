const rateLimit = require("express-rate-limit");

// Shared limiter for endpoints that can trigger currency-earning events.
const currencyEventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CURRENCY_EVENT_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

module.exports = currencyEventLimiter;
