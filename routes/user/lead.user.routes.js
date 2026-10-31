const express = require("express");
const { createLead } = require("../../controllers/user/lead.user.controller");



const router = express.Router();

router.post("/", createLead);

module.exports = router;
