const { loadJSON } = require("../utils/fileLoader");
const getNeighborhoods = loadJSON("../data/reference/neighborhoods.json");
const getAvenues = loadJSON("../data/reference/avenues.json");

module.exports = {
  getNeighborhoods,
  getAvenues,
};