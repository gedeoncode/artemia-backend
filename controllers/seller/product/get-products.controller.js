const { getSellerProductsService } = require("../../../services/seller/product");
const catchAsync = require("../../../utils/catchAsync");

const getSellerProductsController =catchAsync( async (req, res, next) => {
    const result = await getSellerProductsService(req.query, req.seller);

    return res.status(200).json(result);
 
})
module.exports = getSellerProductsController;