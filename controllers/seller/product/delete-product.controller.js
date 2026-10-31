
const { deleteProductService } = require("../../../services/seller/product");
const catchAsync = require("../../../utils/catchAsync");

const deleteProductController =catchAsync( async (req, res, next) => {

    const { productId } = req.params;

    await deleteProductService(productId, req.seller);

    return res.json({
      message: "Product deleted successfully",
    });
  
  })


module.exports = deleteProductController;