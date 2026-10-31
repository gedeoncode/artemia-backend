const {bulkProductActionService} = require("../../../services/seller/product/");
const catchAsync = require("../../../utils/catchAsync");

const bulkProductActionController = catchAsync( async (req, res) => {
    const { productIds, action } = req.body;
    const result = await bulkProductActionService(
      productIds,
      action,
      req.seller,
    );
    return res.json({
      message: "Bulk action completed successfully",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } )

module.exports = bulkProductActionController;
