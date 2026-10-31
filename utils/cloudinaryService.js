const {
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
} = require("../constants/env");
const cloudinary = require("../config");
// const logger = require("../utils/logger");

exports.generateSignature = (sellerId, folder) => {
  const timestamp = Math.round(Date.now() / 1000);

  // Build the folder path (optional safety check)
  const targetFolder = folder ? `${folder}/${sellerId}` : `${sellerId}`;

  // Generate signature with EXACT params you'll send to frontend
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      folder: targetFolder,
      // resource_type: "auto",
    },
    CLOUDINARY_API_SECRET,
  );
  console.log(`Generated Cloudinary signature for seller ID: ${sellerId}`);

  // Send all necessary params to the frontend
  return {
    timestamp,
    signature,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: targetFolder,
  };
};
