const catchAsync = require("../../../utils/catchAsync");
const {
  softDeleteProductService,
} = require("../../../services/seller/product");

const softDeleteProductController =catchAsync( async (req, res, next) => {

    const { productId } = req.params;

    await softDeleteProductService(productId, req.seller);

    return res.status(200).json({
      message: "Product soft-deleted successfully",
    });
   
})

module.exports = softDeleteProductController;