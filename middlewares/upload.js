const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config");
const { AppError } = require("../utils/AppError");
const {
  ALLOWED_FILE_TYPES,
  MAX_SIZE,
  ALLOWED_FORMATS,
} = require("../constants/upload.const");

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only JPG, JPEG, WEBP and PNG are allowed."),
      false,
    );
  }
  cb(null, true);
};

const createCloudinaryUploader = ({ folder, maxFiles }) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const sanitize = (name) =>
        name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "")
          .toLowerCase();

      const originalName = sanitize(file.originalname);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      const userId = req.user?.id || "user"; // From auth middleware
      const productId = req.body?.productId || "product"; // From request body

      return {
        folder,
        public_id: `${originalName}-${uniqueSuffix}`,
        format: "webp",
        quality: "auto:good",

        // 🔥 TAGS (searchable, indexable)
        tags: ["product_image", `user_${userId}`, `product_${productId}`],

        // 🔥 CONTEXT (structured metadata)
        context: {
          userId: userId?.toString(),
          productId: productId?.toString(),
          uploadedAt: new Date().toISOString(),
        },

        // 🔒 Optional: prevent overwrites
        overwrite: false,
      };
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_SIZE,
      files: maxFiles,
    },
  });
};

// ✅ Unified handler: array OR fields based on input
const handleUpload = ({ type, config, folder, maxFiles }) => {
  const uploader = createCloudinaryUploader({ folder, maxFiles });
  return (req, res, next) => {
    const middleware =
      type === "array"
        ? uploader.array(config, maxFiles)
        : uploader.fields(config); // config = [{ name, maxCount }]

    middleware(req, res, async (err) => {
      if (!err) return next();

      try {
        // Normalize uploaded files
        const allFiles = req.files
          ? Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat()
          : [];

        // Cleanup already-uploaded files from Cloudinary
        if (allFiles.length > 0) {
          await cleanupCloudinaryFiles(allFiles);
        }

        // Handle known Multer errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("File too large", 413, "FILE_TOO_LARGE"));
        }

        if (err.code === "LIMIT_FILE_COUNT") {
          return next(
            new AppError(
              `Maximum of ${maxFiles} images allowed.`,
              400,
              "TOO_MANY_FILES",
            ),
          );
        }

        if (err.message?.includes("Invalid file type")) {
          return next(
            new AppError(
              "Invalid file type. Only JPG, JPEG, WEBP and PNG are allowed.",
              415,
              "INVALID_FILE_TYPE",
            ),
          );
        }

        // Fallback error
        return next(
          new AppError(err.message || "Upload failed", 500, "UPLOAD_FAILED"),
        );
      } catch (cleanupError) {
        return next(
          new AppError(
            "Upload failed during cleanup",
            500,
            "UPLOAD_CLEANUP_FAILED",
          ),
        );
      }
    });
  };
};

const cleanupCloudinaryFiles = async (filesObject) => {
  if (!filesObject) return;
  const allFiles = Object.values(filesObject).flat();
  const destroyPromises = allFiles.map((file) => {
    const publicId = file.filename || file.publicId;
    return publicId
      ? cloudinary.uploader.destroy(publicId).catch((err) => {
          console.error("Cloudinary cleanup failed:", err.message);
        })
      : null;
  });

  await Promise.all(destroyPromises);
};

module.exports = { handleUpload, cleanupCloudinaryFiles };
