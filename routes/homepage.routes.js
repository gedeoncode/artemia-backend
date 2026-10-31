const express = require("express");
const homepageController = require("../controllers/homepage.controller");

const router = express.Router();

router.get("/", homepageController.getHomepage);

module.exports = router;