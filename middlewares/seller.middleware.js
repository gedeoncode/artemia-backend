// middleware/seller.middleware.js

const Seller = require("../models/Seller.model");

const { AppError } = require("../utils/AppError");

/* -------------------------------------------------------------------------- */
/*                              Require Seller                                 */
/* -------------------------------------------------------------------------- */

const requireSeller = async (req, res, next) => {
  try {
    // protect() must run first
    if (!req.user) {
      throw new AppError(
        "Authentication required",
        401,
        "UNAUTHORIZED"
      );
    }

    // Basic role check
    if (req.user.role !== "seller") {
      throw new AppError(
        "Seller access required",
        403,
        "SELLER_REQUIRED"
      );
    }

    // Load seller profile
    const seller = await Seller.findOne({
      user: req.user.id,
    }).lean();

    if (!seller) {
        console.log("User:", req.user)
      throw new AppError(
        "Seller profile not found",
        403,
        "SELLER_PROFILE_NOT_FOUND"
      );
    }



    // Attach trusted seller context
    req.seller = seller;

    next();
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                           Require Permission                               */
/* -------------------------------------------------------------------------- */

const requirePermission =
  (...permissions) =>
  async (req, res, next) => {
    try {
      // requireSeller() must run first
      if (!req.seller) {
        throw new AppError(
          "Seller authorization required",
          403,
          "SELLER_REQUIRED"
        );
      }

      const hasPermission = permissions.some(
        (permission) =>
          req.seller.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AppError(
          "Insufficient permissions",
          403,
          "INSUFFICIENT_PERMISSIONS"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  requireSeller,
  requirePermission,
};