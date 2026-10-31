const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const SellerDocument = require("../../models/Document");
const emailService = require("../email");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");
const { REQUIRED_DOCS } = require("../../constants/onboardingConstants");
const { validateDocuments } = require("./validators/documents.validator");

/**
 * Upload or update seller identity documents
 */
exports.uploadDocuments = async ({ sellerId, documents }) => {
  // 1. Validate payload
  const sanitizedDocs = validateDocuments(documents);

  // 2. Load seller
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  // 3. Check required documents
  const sellerType = seller.type || "individual";
  const requiredDocs = REQUIRED_DOCS[sellerType] || REQUIRED_DOCS.individual;
  const missingDocs = requiredDocs.filter((doc) => !sanitizedDocs[doc]);
  if (missingDocs.length) {
    throw new AppError(
      `Missing required documents: ${missingDocs.join(", ")}`,
      400,
      "MISSING_REQUIRED_DOCS",
    );
  }

  // 4. Idempotency/content check
  let existingDocs = {};
  if (seller.documents) {
    const docRecord = await SellerDocument.findById(seller.documents).lean();
    existingDocs = docRecord || {};
  }

  // Compare only the sanitized document fields, ignoring _id/status/timestamps
  const docsChanged = requiredDocs.some(
    (doc) => sanitizedDocs[doc] !== existingDocs[doc],
  );

  if (
    !docsChanged &&
    seller.onboarding.completedSteps.includes("UPLOADDOCUMENTS")
  ) {
    return {
      success: true,
      step: "UPLOADDOCUMENTS",
      message: "Documents already uploaded and step completed.",
    };
  }

  // 5. Start transaction
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 6. Upsert document record
    const documentRecord = await SellerDocument.findOneAndUpdate(
      { sellerId },
      {
        sellerId,
        status: "pending",
        ...sanitizedDocs,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    // 7. Update seller domain data
    seller.documents = documentRecord._id;
    seller.documentUploadDate = new Date();
    seller.documentsUploaded = true;
    await seller.save({ session });

    // 8. Advance onboarding progress if not already done
    let progress = {};
    if (!seller.onboarding.completedSteps.includes("UPLOADDOCUMENTS")) {
      progress = await updateProgress(seller._id, "UPLOADDOCUMENTS", {
        session,
      });
    } else {
      progress = { step: "UPLOADDOCUMENTS", completed: true };
    }

    // 9. Commit transaction
    await session.commitTransaction();

    // 10. Async email notification
    emailService
      .sendEmail({
        to: seller.email,
        type: "DOCUMENT_SUBMISSION",
        data: {
          sellerName: seller.fullName || "Cher vendeur",
        },
        highPriority: true,
      })
      .catch((err) =>
        console.error(`Email send failed for seller ${sellerId}`, err),
      );

    return {
      ...progress,
      document: documentRecord,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
