const express = require("express");
const router = express.Router();

const protect = require("../../middlewares/protect");
const { changePassword } = require("../../controllers/user/changePassword.controller");

// PATCH /user/change-password
router.patch("/", protect(), changePassword);
module.exports = router;