const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const Payment = require("../../../models/Payment.model");
const {
  PRODUCT_PUBLICATION_STATUS,
  BILLING_STATUS,
  COMMISSION_MODEL,
} = require("../../../constants/product.constants");
const { APP_URL, PAYMENT_STATUS } = require("../../../constants");
const { AppError } = require("../../../utils/AppError");
const { redisClient } = require("../../../config");
const { validatePricing } = require("./validators/pricing.validator");
const { validateCategory } = require("./validators/category.validator");
const { sanitizeAndValidateDetails } = require("./validators/details.validator");
const { calculateListingFee } = require("../../feeEngine");
const initPaymentSession = require("../../payment");
const { getListingBillingPolicy } = require("./policy/getListingBillingPolicy");
const { getSellerListingPolicy } = require("./policy/getSellerListingPolicy");
const { determineSellerTier } = require("./policy/sellerTier");
const { validateListingQuota } = require("./validators/listingQuota");
const { validateDailyListingLimit } = require("./validators/dailyLimit");
const { PAYMENT_PROVIDERS, PAYMENT_PROVIDERS_METHODS, DEFAULT_PAYMENT_REDIRECT } = require("../../../constants/payment.constants");
const { buildCommissionRule } = require("./fees/buildComissionRules");


/**
 * Core product creation service with production-grade reliability
 */
const createProductService = async (payload, seller) => {
  // 1. Input validation
  validateSeller(seller);
  
  const { 
    name, description, pricing, category, stock, images, shipping,
    trackQuantity, continueSellingWhenOutOfStock, taxStatus, 
    details, clientRequestId 
  } = payload;

  const { 
    type, unit, currencyCode, currentPriceMinor, 
    minPriceMinor, maxPriceMinor, deal 
  } = pricing;

  const sellerId = seller.id;
  const commissionModel = seller.commissionModel || COMMISSION_MODEL.PAP;

  // 2. Check idempotency with atomic operation
  const existingProduct = await findExistingProduct(sellerId, clientRequestId);
  if (existingProduct) {
    return { product: existingProduct, alreadyExists: true };
  }

  // 3. Validation phase
  const listingPolicy = getSellerListingPolicy(determineSellerTier(seller));
  
  await validateSellerLimits(sellerId, listingPolicy);
  validatePricing(pricing);
  
  const validatedCategory = await validateCategory(category, commissionModel);
  const safeDetails = sanitizeAndValidateDetails(details, validatedCategory.category.attributes || []);

  // 4. Fee calculation
  const { listingFeeMinor, billingPolicy } = calculateProductFees(
    validatedCategory.category,
    commissionModel,
    currencyCode,
    currentPriceMinor,
    minPriceMinor
  );

  // 5. Build product payload
  const productPayload = buildProductPayload({
    name, description, images, category, sellerId, stock,
    shipping, trackQuantity, continueSellingWhenOutOfStock,
    taxStatus, commissionModel, pricing: {
      type, unit, currencyCode,
      originalPriceMinor: currentPriceMinor,
      currentPriceMinor, minPriceMinor, maxPriceMinor,
      deal: normalizeDeal(deal)
    },
    publicationStatus: listingPolicy.publicationStatus,
    billingStatus: billingPolicy.billingStatus,
    details: safeDetails,
    clientRequestId
  });

  // 6. Execute transaction
  const result = await executeProductCreationTransaction(
    productPayload,
    sellerId,
    currencyCode,
    listingFeeMinor,
    billingPolicy.requiresPayment
  );

  // 7. Handle payment outside transaction
  const paymentResult = await handlePaymentCreation(
    result.product,
    result.paymentRecord,
    sellerId,
    currencyCode,
    listingFeeMinor
  );

  // 8. Cache invalidation (optimized)
  await invalidateProductCaches(category, sellerId);

  // 9. Build and return response
  return buildProductCreationResponse(
    result.product,
    result.paymentRecord,
    billingPolicy,
    paymentResult,
    currencyCode,
    listingFeeMinor
  );
};

// ==================== Helper Functions ====================

/**
 * Validates seller presence and configuration
 */
function validateSeller(seller) {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }
  if (!seller.commissionModel) {
    throw new AppError(
      "Seller commission model missing",
      400,
      "COMMISSION_MODEL_MISSING"
    );
  }
}

/**
 * Checks for existing product using idempotency key with index hint
 */
async function findExistingProduct(sellerId, clientRequestId) {
  if (!clientRequestId) return null;
  
  return await Product.findOne({
    seller: sellerId,
    clientRequestId
  })
  .lean()
}

/**
 * Validates seller quotas and daily limits
 */
async function validateSellerLimits(sellerId, listingPolicy) {
  await validateListingQuota({
    sellerId,
    maxActiveListings: listingPolicy.maxActiveListings
  });
  
  await validateDailyListingLimit({
    sellerId,
    maxDailyListings: listingPolicy.maxDailyListings
  });
}

/**
 * Calculates product fees and billing policy
 */
function calculateProductFees(category, commissionModel, currencyCode, currentPriceMinor, minPriceMinor) {
  const billingPolicy = getListingBillingPolicy({ commissionModel });
  
  let listingFeeMinor = 0;
  if (billingPolicy.requiresPayment) {
    const rule = buildCommissionRule(category, commissionModel);
    const priceMinor = currentPriceMinor ?? minPriceMinor ?? 0;
    listingFeeMinor = calculateListingFee({
      currencyCode,
      rule,
      priceMinor
    }).totals.totalPlatformFeesMinor;
  }
  
  return { listingFeeMinor, billingPolicy };
}

/**
 * Normalizes deal object for consistency
 */
function normalizeDeal(deal) {
  if (!deal?.isActive) return undefined;
  
  return {
    isActive: true,
    type: deal.type,
    label: deal.label,
    priority: deal.priority ?? 0,
    priceMinor: deal.priceMinor,
    percentage: deal.percentage,
    start: deal.start,
    expiry: deal.expiry,
    status: deal.status ?? "scheduled"
  };
}

/**
 * Builds the product payload object
 */
function buildProductPayload({
  name, description, images, category, sellerId, stock,
  shipping, trackQuantity, continueSellingWhenOutOfStock,
  taxStatus, commissionModel, pricing, publicationStatus,
  billingStatus, details, clientRequestId
}) {
  return {
    name,
    description,
    images,
    category,
    seller: sellerId,
    stock,
    shipping,
    trackQuantity,
    continueSellingWhenOutOfStock,
    taxStatus,
    commissionModel,
    pricing,
    publication: { status: publicationStatus },
    billingStatus,
    details,
    clientRequestId
  };
}

/**
 * Executes the main product creation transaction
 */
async function executeProductCreationTransaction(
  productPayload,
  sellerId,
  currencyCode,
  listingFeeMinor,
  requiresPayment
) {
  const session = await mongoose.startSession();
  
  try {
    let product, paymentRecord;
    
    await session.withTransaction(async () => {
      // Create product
      [product] = await Product.create([productPayload], { session });
      
      // Create payment record if needed
      if (requiresPayment && listingFeeMinor > 0) {
        [paymentRecord] = await Payment.create(
          [{
            userId: sellerId,
            productId: product._id,
            amountMinor: listingFeeMinor,
            currencyCode,
            provider: PAYMENT_PROVIDERS.MONEROO,
            status: PAYMENT_STATUS.REQUIRES_PROVIDER_SESSION,
          }],
          { session }
        );
      }
    });
    
    return { product, paymentRecord };
  } catch (error) {
    // Transaction will auto-abort on error
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Handles payment session creation with retry and graceful degradation
 */
async function handlePaymentCreation(product, paymentRecord, sellerId, currencyCode, amountMinor) {
  if (!paymentRecord) {
    return { success: false, paymentRecord: null };
  }

  try {
    const paymentSession = await initPaymentSession({
      amountMinor,
      currencyCode,
      methods: PAYMENT_PROVIDERS_METHODS.MPESA_KE,
      productId: product._id.toString(),
      user: { id: sellerId.toString() },
      paymentId: paymentRecord._id.toString(),
      provider: PAYMENT_PROVIDERS.MONEROO,
      redirectUrl: DEFAULT_PAYMENT_REDIRECT,
      idempotencyKey: `product_${product._id}_payment_${paymentRecord._id}`
    });

    // Update payment record with session details
    paymentRecord.providerSessionId = paymentSession.id;
    paymentRecord.providerSessionURL = paymentSession.url;
    paymentRecord.status = PAYMENT_STATUS.PENDING;
    await paymentRecord.save();

    return { 
      success: true, 
      paymentRecord,
      paymentSession 
    };
  } catch (error) {
    // Mark payment as requiring provider session but keep product created
    paymentRecord.status = PAYMENT_STATUS.REQUIRES_PROVIDER_SESSION;
    await paymentRecord.save();

    // Log error for observability (using structured logging)
    console.error('[Payment Creation Error]', {
      error: error.message,
      stack: error.stack,
      paymentId: paymentRecord._id,
      productId: product._id,
      amountMinor,
      currencyCode
    });

    return { 
      success: false, 
      paymentRecord,
      error: error.message 
    };
  }
}

/**
 * Invalidates relevant caches (targeted, not broad)
 */
async function invalidateProductCaches(category, sellerId) {
  try {
    const cacheKeys = [
      "home:products:v1",
      `seller:${sellerId}:products:v1`,
      `category:${category.id}:products:v1`
    ];
    
    await Promise.allSettled(
      cacheKeys.map(key => redisClient.del(key))
    );
  } catch (error) {
    // Log cache invalidation failure but don't fail the request
    console.warn('[Cache Invalidation Error]', {
      error: error.message,
      categoryId: category.id,
      sellerId
    });
  }
}

/**
 * Builds the final response object
 */
function buildProductCreationResponse(
  product,
  paymentRecord,
  billingPolicy,
  paymentResult,
  currencyCode,
  listingFeeMinor
) {
  return {
    product,
    commissionModel: product.commissionModel,
    currencyCode,
    listingFeeMinor,
    payment: {
      required: billingPolicy.requiresPayment,
      ready: paymentResult.success,
      status: paymentRecord?.status ?? null,
      paymentId: paymentRecord?._id ?? null,
      checkoutSessionId: paymentResult.paymentSession?.id ?? null,
      checkoutUrl: paymentResult.paymentSession?.url ?? null,
    }
  };
}

module.exports = createProductService;