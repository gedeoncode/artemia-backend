const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.getDraft = catchAsync(async (req, res) => {
  const data = await OnboardingService.getDraft(req.seller._id);
  return res.json({
    success: true,
    data,
  });
});
