// change change password
const bcrypt = require("bcryptjs");
const User = require("../../models/User.model");

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1️⃣ Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "All password fields are required" });
    }

    // 2️⃣ Confirm new password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirmation do not match",
      });
    }

    // 3️⃣ Password policy
    const passwordPolicy =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^#_\-+=])[A-Za-z\d@$!%*?&()[\]{}^#_\-+=]{8,}$/;

    if (!passwordPolicy.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    // 4️⃣ Fetch user WITH password
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optional safety checks
    if (user.isBlocked || user.isDeleted) {
      return res
        .status(403)
        .json({ message: "Account is not allowed to change password" });
    }

    // 5️⃣ Verify current password (schema method)
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 6️⃣ Prevent password reuse
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from the current password",
      });
    }

    // 7️⃣ Hash & save new password
    user.password = newPassword;

    // lastPasswordChangeAt and hashed password will be set in pre("save")
    await user.save({ validateBeforeSave: false });
    // 8️⃣ Success
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
