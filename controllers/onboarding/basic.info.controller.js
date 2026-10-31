const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.saveBasicInfo = catchAsync(async (req, res) => {
  const sellerId = req.seller.id;

  const updatedSeller = await OnboardingService.saveBasicInfo({
    sellerId,
    payload: req.body,
  });

  return res.status(200).json({
    success: true,
    message: "Basic info saved successfully",
    data: updatedSeller,
  });
});
