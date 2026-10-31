// utils/validateCloudinaryUrl.js
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

module.exports = function validateCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    // Accept both http/https (Cloudinary can redirect) but enforce host & path
    const hostOk =
      u.hostname === "res.cloudinary.com" ||
      u.hostname.endsWith(".res.cloudinary.com");
    const cloudOk = CLOUD_NAME
      ? u.pathname.startsWith(`/${CLOUD_NAME}/`)
      : true; // if cloud name not set, skip strict check
    return hostOk && cloudOk;
  } catch {
    return false;
  }
};
