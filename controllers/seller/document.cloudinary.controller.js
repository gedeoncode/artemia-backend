const { ALLOWED_FILE_TYPES } = require("../../constants/fileTypes");
const { generateSignature } = require("../../utils/cloudinaryService");
exports.getUploadSignature = (req, res) => {
  try {
    const sellerId = req.seller?._id;
    if (!sellerId) {
      return res.status(400).json({ message: "Seller ID is required." });
    }

    const { fileType } = req.body;
    if (fileType && !ALLOWED_FILE_TYPES.includes(fileType)) {
      console.log(`Invalid file type attempted: ${fileType}`);
      return res.status(400).json({ message: "Invalid file type." });
    }

    const signatureData =generateSignature(
      sellerId,
      "seller_documents"
    );

    res.json(signatureData);
  } catch (error) {
    console.error("Error generating Cloudinary signature", { error });
    res.status(500).json({ message: "Failed to generate upload signature" });
  }
};
