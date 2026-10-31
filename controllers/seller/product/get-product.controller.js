const { getSellerProductService } = require("../../../services/seller/product");
const catchAsync = require("../../../utils/catchAsync");

const getSellerProductController =catchAsync( async (req, res, next) => {

    const { productId } = req.params;
    

    const product = await getSellerProductService(productId, req.seller);

    return res.status(200).json(product);
  
})

module.exports = getSellerProductController;