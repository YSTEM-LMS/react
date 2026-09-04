/**
 * Authentication Routes
 *
 * Handles user authentication operations including login and JWT validation.
 * Uses JWT tokens for stateless authentication and Passport.js for middleware.
 *
 * Features:
 * - User login with username/password
 * - JWT token generation
 * - Token validation for protected routes
 * - Password hashing via utils/password (bcrypt, with transparent
 *   upgrade-on-login for accounts still on the legacy SHA-384 hash)
 */

const express = require("express");
const passport = require("passport");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { check, body, validationResult } = require("express-validator");
const users = require("../models/users");
const jwt = require("jsonwebtoken");
const config = require("config");
const { verifyAndMaybeUpgrade } = require("../utils/password");

// Scoped by IP + attempted username, not IP alone — a school computer lab
// or NAT'd network can put many legitimate logins behind one IP, and an
// IP-only limit would lock out a whole classroom instead of just slowing
// down repeated guesses against one account. Only applied to /login, not
// /validate, so routine session-check traffic can't burn through the
// same budget as actual login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
  keyGenerator: (req, res) => {
    const username = req.body && req.body.username ? String(req.body.username).toLowerCase() : "";
    return `${rateLimit.ipKeyGenerator(req, res)}:${username}`;
  },
});

/**
 * POST /auth/validate
 * 
 * Validates the legitimacy of a provided JWT token.
 * Used to check if a user's session is still valid.
 * 
 * @access JWT authentication required
 */
router.post("/validate", passport.authenticate("jwt", { session: false }), async (req, res) => {
  if (req.user) {
    res.sendStatus(200);
  } else {
    res
      .status(405)
      .json("Error 405: User authentication is not valid or expired");
  }
});

// @route   POST /auth/login
// @desc    POST login the requested user and return a jwt
// @access  Public
router.post(
  "/login",
  loginLimiter,
  [
    body("username", "Username is required").not().isEmpty(),
    body("password", "Password is required").not().isEmpty(),
  ],
  async (req, res) => {
    try {
      //Validation checks to ensure the required fields are present
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required in request body" });
      }

      //Find the user with the provided credentials
      let foundUser = await users.findOne({ username });
      if (!foundUser) {
        return res.status(400).json("The username or password is incorrect.");
      }

      const { ok, upgradedHash } = await verifyAndMaybeUpgrade(password, foundUser.password);
      if (!ok) {
        return res.status(400).json("The username or password is incorrect.");
      }

      // Transparently migrate accounts still on the legacy SHA-384 hash to
      // bcrypt on successful login. See utils/password.js for why.
      if (upgradedHash) {
        foundUser.password = upgradedHash;
        await foundUser.save();
      }

      //Create a payload for the jwt to have accessible fields from the jwt
      const payload = {
        username: foundUser.username,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        email: foundUser.email,
        iat: Math.floor(Date.now() / 1000),
        accountCreatedAt: foundUser.accountCreatedAt,
      };

      if (foundUser.role === "student") {
        payload.parentUsername = foundUser.parentUsername;
      }

      //Sign the jwt
      jwt.sign(
        payload,
        config.get("indexKey"),
        { expiresIn: 360000 },
        function (err, token) {
          if (err) throw err;
          res.json({ token });
        }
      );

      return jwt; //Return the encrypted jwt
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
