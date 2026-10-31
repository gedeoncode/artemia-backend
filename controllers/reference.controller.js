const referenceService = require("../services/reference.service");
const catchAsync = require("../utils/catchAsync");

const getNeighborhoods= catchAsync(async (req, res) => {
    const data = await referenceService.getNeighborhoods();
    res.set("Cache-Control", "public, max-age=86400"); // 1 day cache
    res.json(data);

})

const  getAvenues = catchAsync( async(req, res) => {
    const data = await referenceService.getAvenues();
    res.set("Cache-Control", "public, max-age=86400");
    res.json(data);

})

module.exports = {
  getNeighborhoods,
  getAvenues,
};
