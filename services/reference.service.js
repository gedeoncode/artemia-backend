
const { Cache } = require("../helpers/cache");
const referenceModel = require("../models/reference.model");
const cacheKeys = require("../constants/cacheKeys");


async function getNeighborhoods() {
    const cached = await Cache.get(cacheKeys.NEIGHBORHOODS);
  if (cached) {
    return cached;
  }
  const data = await referenceModel.getNeighborhoods();
  await Cache.set(cacheKeys.NEIGHBORHOODS, data, 86400);
    return data;
}

async function getAvenues() {
  const cached = await Cache.get(cacheKeys.AVENUES); 
  if (cached) {
    return cached;
  }
  const data = await referenceModel.getAvenues();
  await Cache.set(cacheKeys.AVENUES, data, 86400);
  return data;
}

module.exports = {
  getNeighborhoods,
  getAvenues,
};
