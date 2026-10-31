const { stepOrder } = require("./progress");

function requireStep(requiredStep) {
  return (req, res, next) => {
    const seller = req.seller;
    if (!seller) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requiredIndex = stepOrder.indexOf(requiredStep);
    if (requiredIndex === -1) {
      return res.status(500).json({ message: "Invalid step config" });
    }

    const sellerIndex = stepOrder.indexOf(seller.onboarding.step || "ADDRESS");

    if (sellerIndex < requiredIndex) {
      return res.status(403).json({
        message: `You must complete step: ${
          stepOrder[requiredIndex - 1] || "START"
        } before continuing.`,
      });
    }

    next();
  };
}

module.exports = { requireStep };
