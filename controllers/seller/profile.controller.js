const Seller = require("../../models/Seller.model");
const bcrypt = require("bcryptjs");
const User = require("../../models/User.model");
const { COMMISSION_MODES } = require("../../constants/onboardingConstants");
const { AppError } = require("../../utils/AppError");

// GET seller profile
exports.getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).populate("documents");
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.json({ message: "Seller profile fetched successfully", seller });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE seller profile
exports.updateSellerProfile = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const userId = req.seller.user; // from auth middleware

    if (!sellerId || !userId) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // 🔹 USER FIELDS
    const userFields = ["firstName", "lastName", "phone", "dob", "country"];

    const userUpdates = {};
    for (const key of userFields) {
      if (req.body[key] !== undefined) {
        userUpdates[key] = req.body[key];
      }
    }

    // 🔹 SELLER FIELDS
    const sellerFields = [
      "businessName",
      "businessAddress",
      "commissionModel",
      "preferredCurrency",
    ];

    const sellerUpdates = {};
    for (const key of sellerFields) {
      if (req.body[key] !== undefined) {
        sellerUpdates[key] = req.body[key];
      }
    }

    // Update User
    let user;
    if (Object.keys(userUpdates).length) {
      user = await User.findByIdAndUpdate(userId, userUpdates, {
        new: true,
        runValidators: true,
      });
    }

    // Update Seller
    let seller;
    if (Object.keys(sellerUpdates).length) {
      seller = await Seller.findByIdAndUpdate(sellerId, sellerUpdates, {
        new: true,
        runValidators: true,
      });
    }

    res.json({
      message: "Profile updated successfully",
      user,
      seller,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateSellingMode = async (req, res) => {
  const { mode } = req.body;

  // Validate mode
  if (!Object.values(COMMISSION_MODES).includes(mode)) {
    throw new AppError(
      "Invalid commission mode",
      400,
      "INVALID_COMMISSION_MODE"
    );
  }

  try {
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({ message: "Vendeur non trouvé" });
    }

    seller.commissionModel = mode;
    await seller.save({validateBeforeSave: false}); 

    res.json({
      success: true,
      message: "Mode de vente mis à jour avec succès",
      seller: {
        id: seller._id,
        commissionModel: seller.commissionModel,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la mise à jour du type de vendeur :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
