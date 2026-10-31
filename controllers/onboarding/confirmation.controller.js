const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.confirmOnboarding = catchAsync(async (req, res) => {
  const { id: userId, jti } = req.user;

  // 3️Call service to confirm onboarding
  const result = await OnboardingService.confirm({ userId, jti });

  //  Respond
  return res.status(200).json({
    success: true,
    message: "Onboarding confirmed successfully",
    data: result,
  });
});
