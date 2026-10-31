const {
  uploadProductImagesService,
} = require("../../../services/seller/product");


const catchAsync = require("../../../utils/catchAsync");

const uploadProductImagesController = catchAsync(async (req, res, next) => {
  const result = await uploadProductImagesService(req.files);

  return res.status(200).json({
    success: true,
    images: result.urls,
    thumbnails: result.thumbnails,
    publicIds: result.publicIds,
  });
});
module.exports = uploadProductImagesController;