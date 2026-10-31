const { getCheckoutProduct } = require("../../services/order/checkout.service");
const catchAsync = require("../../utils/catchAsync");

const getCheckoutProductController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const product = await getCheckoutProduct(id);

  return res.status(200).json({
    product,
  });
});

module.exports = {
    getCheckoutProductController
}