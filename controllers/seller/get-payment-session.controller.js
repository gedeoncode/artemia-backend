const { getPaymentSessionService } = require("../../services/seller");
const catchAsync = require("../../utils/catchAsync");

const getPaymentSessionController =catchAsync( async (req, res, next) => {
  
    const { sessionId } = req.params;

    const session = await getPaymentSessionService(sessionId, req.seller);

    return res.status(200).json({
      success: true,
      data: session,
    });
  })

module.exports = getPaymentSessionController;