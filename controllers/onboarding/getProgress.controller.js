const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.getProgress = catchAsync(async (req, res) => {
  const data = await OnboardingService.getProgress(req.seller.id);

  return res.json({
    success: true,
    message: "Progress fetched successfully",
    data: {
      ...data,
      role: req.user.role,
    },
  });
});
