const {deleteProductImageService} = require("../../../services/seller/product/");
const catchAsync = require("../../../utils/catchAsync");

const deleteProductImageController = catchAsync( async (req, res, next) => {
    const { publicId } = req.body;
  console.log("Public Id:", publicId);
    await deleteProductImageService(publicId);
    return res.json({
      success: true,
      message: "Image deleted successfully",
    });  
})
module.exports = deleteProductImageController;
