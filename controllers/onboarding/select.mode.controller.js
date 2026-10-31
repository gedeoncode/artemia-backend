const catchAsync = require("../../utils/catchAsync");
const OnboardingService = require("../../services/onboarding");

exports.selectCommissionMode = catchAsync(async (req, res) => {
  const sellerId = req.seller.id;

  const result = await OnboardingService.selectCommissionMode({
    sellerId,
    mode: req.body.mode,
  });

  return res.status(200).json({
    success: true,
    message: "Type de vendeur mis à jour avec succès",
    data: result,
  });
});
