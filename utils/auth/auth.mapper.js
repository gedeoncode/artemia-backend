const buildAuthPayload = (user, seller = null) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  signupIntent: user.signupIntent,
  ...(seller && {
    onboardingCompleted: seller.onboarding.completed,
    sellerId: seller._id,
    verificationStatus: seller.verificationStatus,
    categories: seller.categories,
    sellerType: seller.sellerType,
    commissionModel: seller.commissionModel,
    hasPaid: seller.hasPaid,
  }),
});

module.exports = { buildAuthPayload };
