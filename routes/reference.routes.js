const express = require("express");
const controller = require("../controllers/reference.controller");

const router = express.Router();

router.get("/neighborhoods", controller.getNeighborhoods);
router.get("/avenues", controller.getAvenues);

module.exports = router;
