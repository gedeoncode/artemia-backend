const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.saveIdentity = catchAsync(async (req, res) => {
  const sellerId = req.seller.id;
  const updatedSeller = await OnboardingService.saveIdentity({
    sellerId,
    payload: req.body,
  });

  return res.status(200).json({
    success: true,
    message: "Identity saved successfully",
    data: updatedSeller,
  });
});
