const { updateProductService } = require("../../../services/seller/product");
const catchAsync = require("../../../utils/catchAsync");

const updateProductController =catchAsync( async (req, res, next) => {
  
    const { productId } = req.params;

    const product = await updateProductService(
      productId,
      req.body,
      req.seller,
      req.files,
    );

    return res.json({
      message: "Product updated successfully",
      product,
    });
  })

module.exports = updateProductController;