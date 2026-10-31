const express = require("express");

const { createLead } = require("../controllers/customerLead.controller");

const router = express.Router();

router.post("/", createLead);

module.exports = router;
