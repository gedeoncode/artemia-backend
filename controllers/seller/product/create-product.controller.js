const catchAsync = require("../../../utils/catchAsync");
const { createProductService } = require("../../../services/seller/product/");

const createProductController = catchAsync(async (req, res) => {
  const { body, seller } = req;
  
  // Validate seller presence early
  if (!seller) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED"
    });
  }

  // Execute product creation
  const result = await createProductService(body, seller);

  // Handle idempotent request
  if (result.alreadyExists) {
    return res.status(200).json({
      success: true,
      message: "Product already exists",
      productId: result.product._id,
      alreadyExists: true,
      payment: result.payment // Include payment info if available
    });
  }

  // Build consistent response
  const response = {
    success: true,
    message: "Product created successfully",
    productId: result.product._id,
    commissionModel: result.commissionModel,
    currencyCode: result.currencyCode,
    listingFeeMinor: result.listingFeeMinor,
    payment: {
      required: result.payment.required,
      status: result.payment.status,
      paymentId: result.payment.paymentId,
      checkoutSessionId: result.payment.checkoutSessionId,
      checkoutUrl: result.payment.checkoutUrl,
      ready: result.payment.ready
    }
  };

  // Log completion for observability
  if (requestId) {
    console.info('[Product Creation]', {
      requestId,
      productId: result.product._id,
      sellerId: seller.id,
      paymentRequired: result.payment.required,
      paymentStatus: result.payment.status
    });
  }

  return res.status(201).json(response);
});

module.exports = createProductController;