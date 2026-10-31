const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const {AppError} = require("../../../utils/AppError");
const { getCurrencyPrecision } = require("../../../utils/currency");
const cloudinary = require("../../../config");

const updateProductService = async (productId, payload, seller, files = []) => {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400, "INVALID_PRODUCT_ID");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (product.seller.toString() !== seller.id.toString()) {
    throw new AppError(
      "Unauthorized access",
      403,
      "UNAUTHORIZED_PRODUCT_ACCESS",
    );
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
  } = payload;

  // -------------------------
  // 1️⃣ Handle Image Deletions
  // -------------------------

  if (Array.isArray(removedPublicIds) && removedPublicIds.length > 0) {
    for (const publicId of removedPublicIds) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn(`Cloudinary delete failed for ${publicId}:`, err.message);
      }
    }

    product.images = product.images.filter(
      (img) =>
        !removedPublicIds.includes(
          typeof img === "string" ? img : img.publicId,
        ),
    );
  }

  // -------------------------
  // 2️⃣ Handle New Uploads
  // -------------------------

  if (Array.isArray(files) && files.length > 0) {
    const newImages = files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      thumbnailUrl: file.path.replace(
        "/upload/",
        "/upload/c_thumb,w_200,h_200/",
      ),
    }));

    product.images = [...product.images, ...newImages];
  } else if (Array.isArray(images) && images.length > 0) {
    product.images = images;
  }

  // -------------------------
  // 3️⃣ Price Conversion (Minor Units)
  // -------------------------

  if (price !== undefined) {
    if (isNaN(price)) {
      throw new AppError("Invalid price", 400, "INVALID_PRICE");
    }

    const currencyCode = product.currencyCode || "KES";
    const precision = getCurrencyPrecision(currencyCode);
    const priceMinor = Math.round(Number(price) * 10 ** precision);

    if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
      throw new AppError(
        "Invalid price after conversion",
        400,
        "INVALID_PRICE_MINOR",
      );
    }

    product.priceMinor = priceMinor;
  }

  // -------------------------
  // 4️⃣ Safe Field Updates
  // -------------------------

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (category !== undefined) product.category = category;
  if (subCategory !== undefined) product.subCategory = subCategory;
  if (stock !== undefined) product.stock = stock;
  if (shipping !== undefined) product.shipping = shipping;
  if (variants !== undefined) product.variants = variants;
  if (status !== undefined) product.status = status;
  if (trackQuantity !== undefined) product.trackQuantity = trackQuantity;
  if (continueSellingWhenOutOfStock !== undefined)
    product.continueSellingWhenOutOfStock = continueSellingWhenOutOfStock;
  if (physicalProduct !== undefined) product.physicalProduct = physicalProduct;
  if (taxStatus !== undefined) product.taxStatus = taxStatus;
  if (isDeal !== undefined) product.isDeal = isDeal;
  if (dealPrice !== undefined) product.dealPrice = dealPrice;
  if (dealExpiry !== undefined) product.dealExpiry = dealExpiry;

  await product.save();

  return product;
};

module.exports = updateProductService;
