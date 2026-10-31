const { markProductAsPaidService } = require("../../../services/seller/product");
const catchAsync = require("../../../utils/catchAsync");


const markProductAsPaidController =catchAsync( async (req, res) => {

    const { productId } = req.params;

    const product = await markProductAsPaidService(
      productId,
      req.seller,
      req.body,
    );

    return res.json({
      message: "Product marked as paid",
      product,
    });
  
})

module.exports = markProductAsPaidController;