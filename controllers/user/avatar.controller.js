const cloudinary = require("../../config/");
const User = require("../../models/User.model");

exports.updateAvatar = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const file = req.files[0];
  const newUrl = file.path;
  const newPublicId = file.filename || file.public_id;

  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      await cloudinary.uploader.destroy(newPublicId);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Extract old Cloudinary public_id
    let oldPublicId = null;
    if (user.avatar) {
      const match = user.avatar.match(/\/upload\/(?:v\d+\/)?([^/.]+)/);
      oldPublicId = match ? match[1] : null;
    }

    // Update avatar
    user.avatar = newUrl;
    await user.save({ validateBeforeSave: false });

    // Cleanup old avatar (non-blocking)
    if (oldPublicId && oldPublicId !== newPublicId) {
      cloudinary.uploader
        .destroy(oldPublicId)
        .catch(() => console.warn("Old avatar cleanup failed"));
    }

    res.status(200).json({
      success: true,
      data: { url: newUrl },
    });
  } catch (error) {
    console.error("Avatar update error:", error);

    // Roll back new upload
    if (newPublicId) {
      await cloudinary.uploader
        .destroy(newPublicId)
        .catch(() => console.warn("Rollback cleanup failed"));
    }

    res.status(500).json({
      success: false,
      message: "Server error during avatar update",
    });
  }
};
