const mongoose = require("mongoose");
const Product = require("../../models/Product.model");
const Category = require("../../models/category.model");
const fs = require("fs");
const path = require("path");
const Payment = require("../../models/Payment.model");
const { PRODUCT_STATUS, PAYMENT_STATUS } = require("../../constants/");
const { initPaymentSession } = require("../../services/payment/"); // wrapper around Stripe/Moneroo/Flutterwave
const detectSellerCurrency = require("../../services/seller/detectSellerCurrency");
const { redisClient } = require("../../config/redis.config");
const { cloudinary } = require("../../config/");
const { APP_URL } = require("../../constants/env");
const { calculateListingFee } = require("../../services/feeEngine");
const { getCurrencyPrecision } = require("../../utils/currency");
const { HANDLED_BY_MAP, CURRENCY_CODE } = require("../../constants/product.constants");

/**
 * Create Product Controller
 * - Handles PAP (pay before publishing) and PAL (commission after listing)
 */

const createProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      description,
      price, // expected as decimal string from frontend
      category,
      subCategory,
      stock,
      images,
      shipping,
      trackQuantity,
      continueSellingWhenOutOfStock,
      physicalProduct,
      taxStatus,
      isDeal,
      dealPrice,
      dealExpiry,
      details,
    } = req.body;

    const { id: sellerId, commissionModel } = req.seller;

    if (!commissionModel) {
      throw new Error("Seller commission model missing");
    }

    // -------------------------
    // 1️⃣ Validate Price
    // -------------------------
    if (!price || isNaN(price)) {
      throw new Error("Invalid price");
    }

    const currencyCode = CURRENCY_CODE.USD;
    const precision = getCurrencyPrecision(currencyCode);

    const priceMinor = Math.round(Number(price) * 10 ** precision);

    if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
      throw new Error("Invalid price after conversion to minor units");
    }
    // -------------------------
    // 2️⃣ Validate Category
    // -------------------------
    const cat = await Category.findById(category).session(session);
    if (!cat) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Category not found" });
    }

    if (!cat.allowedModes.includes(commissionModel)) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Commission mode not allowed for this category",
      });
    }

    const modeConfig = cat.modeRules[commissionModel];
    if (!modeConfig) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Missing commission configuration",
      });
    }

    // -------------------------
    // 3️⃣ Build Enterprise Rule (Convert % → BPS)
    // -------------------------

    const rule = {
      id: `${cat._id}-${commissionModel}`,
      version: "2026-01",
      model: commissionModel,
      commissionRateBps: Math.round((modeConfig.commissionRate || 0) * 100), // % → BPS
      minFeeMinor: Math.round((modeConfig.minFee || 0) * 100),
      maxFeeMinor:
        modeConfig.maxFee != null
          ? Math.round(modeConfig.maxFee * 100)
          : Number.MAX_SAFE_INTEGER,
      processingFeeFlatMinor: 0,
      processingFeeRateBps: 0,
      taxRateBps: 0,
    };

    // -------------------------
    // 4️⃣ Calculate Fee (Enterprise Engine)
    // -------------------------

    const feeResult = calculateListingFee({
      priceMinor,
      currencyCode,
      rule,
    });

    const listingFeeMinor =
      commissionModel === "PAP" ? feeResult.totals.totalPlatformFeesMinor : 0;

    const handledBy = HANDLED_BY_MAP[commissionModel];
    // -------------------------
    // 6️⃣ Prepare Product Payload
    // -------------------------

    const productPayload = {
      name,
      description,
      priceMinor,
      images,
      category,
      subCategory,
      stock,
      seller: sellerId,
      shipping,
      trackQuantity,
      continueSellingWhenOutOfStock,
      physicalProduct,
      taxStatus,
      isDeal,
      dealPrice,
      dealExpiry,
      commissionModel,
      listingFeeMinor,
      currencyCode,
      status:
        commissionModel === "PAP"
          ? PRODUCT_STATUS.PENDING_PAYMENT
          : PRODUCT_STATUS.ACTIVATED,
      handledBy,
      details: details || {},
    };

    const [product] = await Product.create([productPayload], {
      session,
    });

    let paymentSession = null;

    // -------------------------
    // 7️⃣ Handle PAP Flow
    // -------------------------

    if (commissionModel === "PAP" && listingFeeMinor > 0) {
      const [paymentRecord] = await Payment.create(
        [
          {
            userId: sellerId,
            productId: product._id,
            amountMinor: listingFeeMinor,
            status: PAYMENT_STATUS.PENDING,
            provider: "moneroo",
            currencyCode,
          },
        ],
        { session },
      );

      paymentSession = await initPaymentSession({
        amountMinor: listingFeeMinor, // provider expects decimal
        currencyCode: currencyCode,
        methods: ["mpesa_ke"],
        productId: product._id.toString(),
        user: {
          id: sellerId.toString(),
          email: "gedeoncode@gmail.com",
          firstName: "Gedeon",
          lastName: "Kakira",
          phone: "+254700000000",
        },
        paymentId: paymentRecord._id.toString(),
        provider: "moneroo",
        redirectUrl: `${APP_URL}/seller/payment?paymentSession_id={CHECKOUT_SESSION_ID}`,
      });

      paymentRecord.providerSessionId = paymentSession.id;
      paymentRecord.providerSessionURL = paymentSession.url;
      await paymentRecord.save({ session });
    }

    // -------------------------
    // 8️⃣ Commit
    // -------------------------

    await session.commitTransaction();
    redisClient.del("home:products:v1");

    return res.status(201).json({
      message: "Product created successfully",
      productId: product._id,
      commissionModel,
      currencyCode,
      listingFeeMinor,
      paymentSessionId: paymentSession?.id || null,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Product Creation Error:", err);
    return res.status(500).json({
      message: "Could not create product",
    });
  } finally {
    session.endSession();
  }
};

// 📋 List Products for Logged-in Seller
const getSellerProducts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Filtering

    const filter = { seller: req.seller.id, isDeleted: { $ne: true } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category)
      filter.category = req.query.category || req.query.categoryId;
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }
    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort && req.query.order) {
      sort = { [req.query.sort]: req.query.order === "asc" ? 1 : -1 };
    }
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select("_id name price stock category status images sales")
      .populate({ path: "category", select: "name" })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    res.status(200).json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Failed to fetch seller products:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};
const getSellerProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId)
      .select(
        "_id name description price stock category subCategory images seller",
      )
      .populate({ path: "category", select: "name" });
    // .populate({ path: "subCategory", select: "name" });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.seller.equals(req.seller.id)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    res.status(200).json(product);
  } catch (err) {
    console.error("Failed to fetch seller product:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    // Find existing product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.seller.equals(req.seller.id)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    const {
      name,
      description,
      price,
      category,
      subCategory,
      stock,
      images,
      shipping,
      variants,
      status,
      trackQuantity,
      continueSellingWhenOutOfStock,
      physicalProduct,
      taxStatus,
      isDeal,
      dealPrice,
      dealExpiry,
      removedPublicIds,
    } = req.body;
    if (Array.isArray(removedPublicIds) && removedPublicIds.length > 0) {
      for (const publicId of removedPublicIds) {
        try {
          await cloudinary_js_config.uploader.destroy(publicId);
        } catch (err) {
          console.warn(
            `Failed to delete image ${publicId} from Cloudinary:`,
            err.message,
          );
        }
      }
      // Remove deleted images from product.images
      product.images = product.images.filter(
        (img) => !removedPublicIds.includes(img.publicId || img),
      );
    }
    if (req.files && req.files.length > 0) {
      // Assume req.files are already uploaded to Cloudinary and have .path and .filename
      const newImages = req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        thumbnailUrl: file.path.replace(
          "/upload/",
          "/upload/c_thumb,w_200,h_200/",
        ),
      }));
      product.images = [...product.images, ...newImages];
    } else if (Array.isArray(images) && images.length > 0) {
      // If images are sent as array of objects (already uploaded to Cloudinary)
      product.images = images;
    }
    // Update fields if provided
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (subCategory) product.subCategory = subCategory;
    if (stock) product.stock = stock;
    if (shipping) product.shipping = shipping;
    if (variants) product.variants = variants;
    if (status) product.status = status;
    if (trackQuantity !== undefined) product.trackQuantity = trackQuantity;
    if (continueSellingWhenOutOfStock !== undefined)
      product.continueSellingWhenOutOfStock = continueSellingWhenOutOfStock;
    if (physicalProduct !== undefined)
      product.physicalProduct = physicalProduct;
    if (taxStatus) product.taxStatus = taxStatus;
    if (isDeal !== undefined) product.isDeal = isDeal;
    if (dealPrice !== undefined) product.dealPrice = dealPrice;
    if (dealExpiry !== undefined) product.dealExpiry = dealExpiry;

    await product.save();
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error("Product Update Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// ❌ Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if the current user is the owner
    if (product.seller.toString() !== req.seller.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Delete image files
    product.images.forEach((imgPath) => {
      const fullPath = path.join(__dirname, "..", imgPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Delete product from DB
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Product Delete Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Soft Delete Product (Mark as Deleted)
const softDeleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product =
      await Product.findById(productId).select("seller isDeleted");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.isDeleted) {
      return res.status(400).json({ message: "Product already deleted" });
    }

    if (product.seller.toString() !== req.seller.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    await Product.findByIdAndUpdate(productId, { isDeleted: true });

    res.status(200).json({ message: "Product soft-deleted successfully" });
  } catch (err) {
    console.error("Soft Delete Product Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// upload images endpoint
const uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.log("no images uploaded ");
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
        code: "NO_FILES",
      });
    }
    if (req.files.length > 10) {
      console.log("Maximum 10 files allowed ");
      return res.status(400).json({
        success: false,
        message: "Maximum 10 files allowed",
        code: "TOO_MANY_FILES",
      });
    }

    // Process Cloudinary upload results
    const images = req.files.map((file) => ({
      url: file.path, // Cloudinary secure URL
      publicId: file.filename, // Cloudinary public ID
      thumbnailUrl: file.path.replace(
        "/upload/",
        "/upload/c_thumb,w_200,h_200/",
      ), // Generated thumbnail
    }));

    res.status(200).json({
      success: true,
      images: images.map((img) => img.url),
      thumbnails: images.map((img) => img.thumbnailUrl),
      publicIds: images.map((img) => img.publicId),
    });
  } catch (err) {
    console.log("erreur: ", erre);
    let statusCode = 500;
    let errorMessage = "Échec du téléchargement des images";
    let errorCode = "UPLOAD_FAILED";
    if (err.message.includes("File too large")) {
      statusCode = 413;
      errorMessage = "La taille du fichier dépasse la limite de 5 Mo";
      errorCode = "FILE_TOO_LARGE";
    } else if (err.message.includes("Invalid file type")) {
      statusCode = 415;
      errorMessage = "Seuls les fichiers JPG, JPEG et PNG sont autorisés";
      errorCode = "INVALID_FILE_TYPE";
    }
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
// In your product controller
const deleteProductImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res
        .status(400)
        .json({ success: false, message: "Identifiant public manquant" });
    }
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      return res.status(404).json({
        success: false,
        message: "Image introuvable ou déjà supprimée",
      });
    }
    res.json({ success: true, message: "Image supprimée avec succès" });
  } catch (error) {
    console.error("Erreur de suppression :", error);
    res.status(500).json({
      success: false,
      message: "Échec de la suppression de l'image",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// PATCH /api/seller/products/bulk
const bulkAction = async (req, res) => {
  const { productIds, action } = req.body;
  try {
    const update = {};
    if (action === "delete") update.isDeleted = true;
    if (action === "archived") update.status = "archived";
    if (action === "draft") update.status = "draft";
    if (action === "activated") update.status = "activated";
    await Product.updateMany(
      { _id: { $in: productIds }, seller: req.seller.id },
      { $set: update },
    );

    const updateProduct = await Product.find({
      _id: { $in: productIds },
      seller: req.seller.id,
    }).select("_id status isDeleted");
    // .populate({ path: "category", select: "name" });
    console.log("Bulk action completed for products:", updateProduct);
    res.json({ message: "Action groupée terminée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Échec de l'action groupée" });
  }
};

// mark a product as paid
const markProductAsPaid = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.seller.toString() !== req.seller.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    product.isPaid = true;
    product.paidAt = new Date();
    product.paymentMethod = req.body.paymentMethod || "unknown";
    product.transactionId = req.body.transactionId || "N/A";
    product.paymentDetails = req.body.paymentDetails || {};
    product.status = "activated"; // Activate product upon payment
    await product.save();
    res.json({ message: "Product marked as paid", product });
  } catch (err) {
    console.error("Mark Product As Paid Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// get payment session for a product
const getPaymentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || !sessionId.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Session ID is required" });
    }

    const providerSessionId = sessionId.trim();

    const session = await Payment.findOne({
      providerSessionId,
      userId: req.seller.id,
    })
      .populate("productId", "name price status")
      .populate("userId", "name email")
      .lean()
      .exec();

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    console.log(
      "Fetching payment session for ID:",
      providerSessionId,
      session.status,
    );

    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("Error fetching payment session:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createProduct,
  getSellerProducts,
  updateProduct,
  deleteProduct,
  softDeleteProduct,
  uploadProductImages,
  bulkAction,
  deleteProductImage,
  getSellerProduct,
  markProductAsPaid,
  getPaymentSession,
};
