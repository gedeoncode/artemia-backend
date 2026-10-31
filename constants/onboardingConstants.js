const COMMISSION_MODES = Object.freeze({ PAL: "PAL", PAP: "PAP" });
const REQUIREDSTEPS = Object.freeze([
  "ADDRESS",
  "IDENTITY",
  "UPLOADDOCUMENTS",
  "MODE",
  "CONFIRMATION",
]);
const ALLOWED_DOC_KEYS = new Set([
  "profilePhoto",
  "idFront",
  "idBack",
  "businessLicense",
  "vatCertificate",
  "businessLogo",
]);
const REQUIRED_DOCS = Object.freeze({
  company: ["profilePhoto", "idFront", "idBack", "businessLicense"],
  individual: ["profilePhoto", "idFront", "idBack"],
});
module.exports = {
  COMMISSION_MODES,
  REQUIREDSTEPS,
  ALLOWED_DOC_KEYS,
  REQUIRED_DOCS,
};
