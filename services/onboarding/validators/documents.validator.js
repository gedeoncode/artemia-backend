const { ALLOWED_DOC_KEYS } = require("../../../constants/onboardingConstants");
const { AppError } = require("../../../utils/AppError");

/**
 * Validates and sanitizes the documents payload.
 * @param {object} documents - The raw documents object from request
 * @returns {object} sanitizedDocs - Only allowed and valid documents
 * @throws {AppError} if validation fails
 */
 function validateDocuments(documents) {
  if (!documents || typeof documents !== "object" || Array.isArray(documents)) {
    throw new AppError(
      "Invalid or empty documents payload.",
      400,
      "INVALID_DOCUMENTS_PAYLOAD"
    );
  }

  const sanitizedDocs = {};

  for (const [key, value] of Object.entries(documents)) {
    if (!ALLOWED_DOC_KEYS.has(key)) {
      throw new AppError(
        `Unsupported document field: ${key}`,
        400,
        "UNSUPPORTED_DOCUMENT_FIELD"
      );
    }

    if (
      !value ||
      typeof value !== "object" ||
      typeof value.url !== "string" ||
      typeof value.publicId !== "string"
    ) {
      throw new AppError(
        `Invalid document object for ${key}`,
        400,
        "INVALID_DOCUMENT_OBJECT"
      );
    }

    if (!/^https?:\/\/res\.cloudinary\.com\//.test(value.url)) {
      throw new AppError(
        `Invalid Cloudinary URL for ${key}`,
        400,
        "INVALID_DOCUMENT_URL"
      );
    }

    sanitizedDocs[key] = {
      url: value.url,
      publicId: value.publicId,
    };
  }

  return sanitizedDocs;
};
module.exports = {
  validateDocuments,
};