const {AppError} = require("../../../utils/AppError");

const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const buildThumbnailUrl = (url) => {
  if (!url.includes("/upload/")) {
    throw new AppError(
      "Invalid Cloudinary URL format",
      500,
      "INVALID_IMAGE_URL",
    );
  }

  return url.replace("/upload/", "/upload/c_thumb,w_200,h_200/");
};

const uploadProductImagesService = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError("No images uploaded", 400, "NO_FILES");
  }

  const images = files.map((file) => {
    return {
      url: file.path,
      publicId: file.filename,
      thumbnailUrl: buildThumbnailUrl(file.path),
    };
  });

  return {
    images,
    urls: images.map((img) => img.url),
    thumbnails: images.map((img) => img.thumbnailUrl),
    publicIds: images.map((img) => img.publicId),
    count: images.length,
  };
};

module.exports = uploadProductImagesService;
