// middlewares/requireUserId.js

/**
 * Middleware to ensure a valid user/seller ID exists on the request object.
 *
 * This ensures consistency, reduces duplication,
 * and centralizes error handling for missing IDs.
 *
 * Options:
 *  - source: string path inside `req` (e.g. "seller.id", "user.id")
 */

function requireUserId({ source = "seller.id" } = {}) {
  return (req, res, next) => {
    try {
      const id = getValue(req, source);

      if (!id) {
        return res.status(400).json({
          error: "USER_ID_MISSING",
          message: `Required ID not found at req.${source}`,
        });
      }

      req.userId = id; // normalized for all routes
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Safely reads nested properties like "seller.id"
 */
function getValue(obj, path) {
  return path.split(".").reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

module.exports = requireUserId;
