// scripts/create-admin.js

require("dotenv").config();

const User = require("../models/user.model");
const Admin = require("../models/Admin.model");
const { connectDB } = require("../config/db.config.js");

// ======================================
// 🔹 Prevent the admin creation in production
// ======================================
function validateEnvironment() {
  const isProduction =
    process.env.NODE_ENV === "production";

  const allowProductionAdminCreation =
    process.env.ALLOW_ADMIN_SCRIPT === "true";

  if (isProduction && !allowProductionAdminCreation) {
    console.error(
      "❌ Admin creation script is blocked in production",
    );

    console.error(
      "Set ALLOW_ADMIN_SCRIPT=true to allow it intentionally.",
    );

    process.exit(1);
  }
}
// ======================================
// 🔹 Create Admin
// ======================================

async function createAdmin() {
  try {
    validateEnvironment()
    await connectDB();

    // ==================================
    // 🔹 Admin Data
    // ==================================

    const adminData = {
     name: "Gedeon",
      email: "admin@marketplace.com",
      password: "ChangeMe123!",
      role: "admin",
      isEmailVerified: true
    };

    // ==================================
    // 🔹 Check Existing User
    // ==================================

    const existingUser = await User.findOne({
      email: adminData.email,
    });

    if (existingUser) {
      console.log("❌ Admin user already exists");

      process.exit(0);
    }

    // ==================================
    // 🔹 Create User
    // ==================================

    const user = await User.create(adminData);

    console.log("✅ User created");

    // ==================================
    // 🔹 Create Admin Profile
    // ==================================

    const admin = await Admin.create({
      user: user._id,

      level: "super_admin",

      permissions: [
        "manage_users",
        "manage_products",
        "manage_orders",
        "manage_sellers",
        "manage_payments",
        "manage_categories",
        "manage_admins",
        "view_reports",
        "refund_orders",
        "review_products",
      ],
    });

    console.log("✅ Admin profile created");

    console.log({
      userId: user._id,
      adminId: admin._id,
      email: user.email,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin");

    console.error(error);

    process.exit(1);
  }
}

createAdmin();