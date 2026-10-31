// src/routes/auth.routes.js

const express = require("express");
const protect = require("../middlewares/protect");
const { getMeController } = require("../controllers/getMe.controller");
const { updateAvatar } = require("../controllers/user/avatar.controller");
const { handleUpload } = require("../middlewares/upload");

const router = express.Router();
const uploadAvatar = handleUpload({
  type: "array",
  config: "avatar",
  folder: "avatars",
  maxFiles: 1,
});
router.get("/", protect(), getMeController);

// POST /user/avatar
router.post("/update/avatar", protect(), uploadAvatar, updateAvatar);

module.exports = router;
