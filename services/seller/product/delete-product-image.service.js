const {cloudinary} = require("../../../config");
const {AppError} = require("../../../utils/AppError");

const deleteProductImageService = async (publicId) => {
  if (!publicId) {
    throw new AppError("Public ID is required", 400, "PUBLIC_ID_REQUIRED");
  }

  const result = await cloudinary.uploader.destroy(publicId);

  if (!result || result.result !== "ok") {
    throw new AppError(
      "Image not found or already deleted",
      404,
      "IMAGE_NOT_FOUND",
    );
  }

  return { success: true };
};

module.exports = deleteProductImageService;
