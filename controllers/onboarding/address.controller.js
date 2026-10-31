const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.saveAddress = catchAsync(async (req, res) => {
  const sellerId = req.seller.id;
  const updatedSeller = await OnboardingService.saveAddress({
    sellerId,
    payload: req.body,
  });

  return res.status(200).json({
    success: true,
    message: "Address saved successfully",
    data: updatedSeller,
  });
});
