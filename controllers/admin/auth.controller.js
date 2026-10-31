const Admin = require("../../models/Admin.model");
const jwt = require("jsonwebtoken");
const {APIError} = require("../../utils/AppError");
const {
  SECURITY_EVENTS,
  logSecurityEvent,
} = require("../../utils/securityLogger");
const {
  validateRoleUpdate,
  validateAdminInput,
} = require("../../utils/validateAdminData");
const sanitizeInput = require("../../utils/sanitizeInput");

// @desc    Fetch all admins
exports.getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select("-password -__v");
    if (!admins || admins.length === 0) {
      logSecurityEvent(SECURITY_EVENTS.NO_ADMINS_FOUND, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        message: "No admins found in the database",
      });
      return next(new APIError("No admins found", 404));
    }
    logSecurityEvent(SECURITY_EVENTS.ADMINS_FOUND, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      message: "Admins found in the database",
      count: admins.length,
    });
    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.ADMINS_ERROR, {
      error: error.message,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    console.warn(`Error fetching admins: ${error.message}`);
    next(new APIError("Failed to fetch admins", 500));
  }
};

// // @desc    Fetch admin by ID
exports.getAdminById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select("-password -__v");
    if (!admin) {
      logSecurityEvent(SECURITY_EVENTS.NO_ADMIN_FOUND, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        message: `Admin not found with ID: ${id}`,
      });
      console.warn(`Admin not found with ID: ${id}`);
      return next(new APIError("Admin not found", 404));
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.ADMIN_ERROR, {
      error: error.message,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    console.warn(`Error fetching admin by ID: ${error.message}`);
    next(new APIError("Failed to fetch admin", 500));
  }
};

// // @desc    Register admin
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    console.log("Admin Registration Data:", {
      Name: name,
      Email: email,
      Role: role,
    });
    // name = sanitizeInput(name);
    // email = sanitizeInput(email);
    // password = sanitizeInput(password);
    // role = sanitizeInput(role);
    if (!name || !email || !password) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_REGISTRATION_ATTEMPT, {
        reason: "Missing required fields",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      console.warn("Admin registration failed - Missing required fields");
      return next(new APIError("All fields are required", 400));
    }
    const { error } = validateAdminInput(req.body);
    if (error) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_REGISTRATION_ATTEMPT, {
        reason: error.details[0].message,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      logger.warn(`Validation error: ${error.details[0].message}`);
      return next(new APIError(error.details[0].message, 400));
    }
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_REGISTRATION_ATTEMPT, {
        reason: "Email already exists",
        email: email,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      console.warn(`Admin creation failed - Email already exists: ${email}`);
      return next(new APIError("Email already exists", 409));
    }
    // Create admin
    const admin = new Admin({
      name,
      email,
      password,
      role,
    });

    await admin.save();
    // Remove sensitive data before sending response
    admin.password = undefined;
    admin.__v = undefined;

    // const token = generateToken(newAdmin);
    logSecurityEvent(SECURITY_EVENTS.ADMIN_REGISTRATION_SUCCESS, {
      email: email,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(201).json({
      message: "Admin registered successfully",
      data: admin,
    });
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.ADMIN_REGISTRATION_FAILED, {
      reason: error.message,
      email: email,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    console.warn(`Error creating admin: ${error.message}`);
    next(new APIError("Failed to create admin", 500));
  }
};

// // @desc    Login admin
// exports.loginAdmin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }
//     // const isMatch = await admin.matchPassword(password);
//     // if (!isMatch) {
//     //   return res.status(401).json({ message: 'Invalid email or password' });
//     // }

//     const token = generateToken(admin);

//     res.status(200).json({
//       message: "Login successful",
//       admin: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role,
//         isSuperAdmin: admin.isSuperAdmin,
//         token,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);

//     res.status(500).json({ message: "Login failed", error: error.message });
//   }
// };

// /**
//  * @desc    Update admin role
//  */
exports.updateAdminRole = async (req, res, next) => {
  try {
    const { error } = validateRoleUpdate(req.body);
    if (error) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_ATTEMPT, {
        reason: error.details[0].message,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      console.warn(`Validation error: ${error.details[0].message}`);
      return next(new APIError(error.details[0].message, 400));
    }

    const { id } = req.params;
    const { role } = req.body;
    console.log("admin role:", {
      Role: role,
    });
    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_ATTEMPT, {
        userId: actorId,
        targetAdminId: id,
        reason: "Admin not found",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return next(new APIError("Admin not found", 404));
    }
    if (admin.role === role) {
      return res.status(200).json({
        success: true,
        message: "Role remains unchanged",
        data: { _id: admin._id, email: admin.email, role: admin.role },
      });
    }
    // Update role
    const currentRole = admin.role;
    admin.role = role;
    await admin.save();
    admin.password = undefined;
    admin.__v = undefined;
    logSecurityEvent(SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_SUCCESS, {
      userId: admin._id,
      email: admin.email,
      oldRole: currentRole,
      newRole: role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    console.info(`Admin role updated successfully: ${admin.role}`);
    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_FAILED, {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    console.error(`Error updating admin role: ${error.message}`);
    next(new APIError("Failed to update role", 500));
  }
};

// /**
//  * @desc    Delete an admin
//  */
exports.deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_DELETE_ATTEMPT, {
        reason: `Admin not found with ID: ${id}`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      console.warn(`Admin not found with ID: ${id}`);
      return next(new APIError("Admin not found", 404));
    }

    // Prevent deletion of super admin
    if (admin.role === "super-admin") {
      logSecurityEvent(SECURITY_EVENTS.ADMIN_DELETE_ATTEMPT, {
        reason: `Attempt to delete super-admin with ID: ${id}`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      console.warn(`Attempt to delete super-admin with ID: ${id}`);
      return next(new APIError("Cannot delete super-admin", 403));
    }

    // Prevent self-deletion
    // if (admin._id.toString() === req.user._id.toString()) {
    //   logger.warn(`Admin attempted self-deletion: ${id}`);
    //   return next(new APIError("Cannot delete yourself", 403));
    // }

    await Admin.findByIdAndDelete(id);
    logSecurityEvent(SECURITY_EVENTS.ADMIN_DELETE_SUCCESS, {
      userId: id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    console.info(`Admin deleted successfully: ${id}`);
    res.status(204).json({
      success: true,
      data: null,
    });
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.ADMIN_DELETE_FAILED, {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    console.error(`Error deleting admin: ${error.message}`);
    next(new APIError("Delete failed", 500));
  }
};
