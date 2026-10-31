// middleware/admin.middleware.js

"use strict";

const Admin = require("../models/Admin.model");

const { AppError } = require("../utils/AppError");

/* -------------------------------------------------------------------------- */
/*                              Require Admin                                 */
/* -------------------------------------------------------------------------- */

const requireAdmin = async (req, res, next) => {
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
    if (req.user.role !== "admin") {
      throw new AppError(
        "Admin access required",
        403,
        "ADMIN_REQUIRED"
      );
    }

    // Load admin profile
    const admin = await Admin.findOne({
      user: req.user.id,
    }).lean();

    if (!admin) {
      throw new AppError(
        "Admin profile not found",
        403,
        "ADMIN_PROFILE_NOT_FOUND"
      );
    }

    // Suspended admin
    if (admin.isSuspended) {
      throw new AppError(
        "Admin account suspended",
        403,
        "ADMIN_SUSPENDED"
      );
    }

    // Attach trusted admin context
    req.admin = admin;

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
      // requireAdmin() must run first
      if (!req.admin) {
        throw new AppError(
          "Admin authorization required",
          403,
          "ADMIN_REQUIRED"
        );
      }

      const hasPermission = permissions.some(
        (permission) =>
          req.admin.permissions.includes(permission)
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
  requireAdmin,
  requirePermission,
};