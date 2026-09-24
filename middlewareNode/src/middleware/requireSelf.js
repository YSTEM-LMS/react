/**
 * Require Self Middleware
 *
 * Ensures the authenticated user (req.user.username) matches the resource owner
 * specified in req.params.username or req.params.userId.
 * Allows bypass if user has role === 'admin'.
 */

const requireSelf = (paramName = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role === "admin") {
      return next();
    }

    const targetUser = req.params[paramName];
    if (!targetUser || req.user.username !== targetUser) {
      return res.status(403).json({ error: "Forbidden: cannot access another user's resource" });
    }

    next();
  };
};

module.exports = requireSelf;
