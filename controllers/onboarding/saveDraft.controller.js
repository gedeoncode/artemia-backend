const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.saveDraft = catchAsync(async (req, res) => {
  const { step, data } = req.body;
  const sellerId = req.seller.id;
  const result = await OnboardingService.saveDraft({
    sellerId,
    step,
    data,
  });
  return res.status(200).json({
    success: true,
    message: "Draft saved successfully",
    data: result,
  });
});


