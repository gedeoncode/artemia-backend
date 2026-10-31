const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.uploadDocuments = catchAsync(async (req, res) => {
  const sellerId = req.seller.id;

  const result = await OnboardingService.uploadDocuments({
    sellerId,
    documents: req.body,
  });

  return res.status(201).json({
    success: true,
    message: "Documents submitted successfully.",
    data: result,
  });
});
