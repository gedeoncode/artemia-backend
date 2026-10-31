const cloudinary = require("../../config");

/**
 * Delete uploaded Cloudinary files if request fails or needs rollback
 * @param {Array|Object} files - Either an array of file objects or single file object
 * @returns {Promise<void>}
 */
async function cleanupCloudinaryFiles(files) {
  if (!files) return;

  const fileArray = Array.isArray(files) ? files : [files];

  const destroyOps = fileArray
    .filter((f) => f && f.path) // Ensure valid file object
    .map((f) => {
      try {
        // Extract public_id from URL or path
        const publicId = extractPublicId(f.path);
        if (!publicId) return null;
        return cloudinary.uploader.destroy(publicId, { invalidate: true });
      } catch (err) {
        console.error("Failed to prepare cleanup for file:", f.path, err);
        return null;
      }
    })
    .filter(Boolean);

  try {
    await Promise.allSettled(destroyOps);
  } catch (err) {
    console.error("Cloudinary cleanup failed:", err.message);
  }
}

/**
 * Extract Cloudinary public_id from a file path or URL
 * @param {string} filePath
 * @returns {string|null}
 */
function extractPublicId(filePath) {
  if (!filePath) return null;

  try {
    // Handles both secure_url (full URL) and public_id direct values
    const parts = filePath.split("/");
    const fileWithExt = parts.pop();
    const publicId = fileWithExt.split(".")[0]; // remove extension

    // In case of nested folders: include last 2–3 segments
    const folderPath = parts.slice(-2).join("/");
    return folderPath ? `${folderPath}/${publicId}` : publicId;
  } catch {
    return null;
  }
}

module.exports = cleanupCloudinaryFiles;
