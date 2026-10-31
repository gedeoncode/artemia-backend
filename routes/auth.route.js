// src/routes/auth.routes.js

const express = require("express");
const {login, resolveRedirect} = require("../controllers/auth.controller");
const { createRateLimiter } = require("../middlewares/createRateLimiter");
const LogoutController  = require("../controllers/auth/logout.controller");
const refreshToken = require("../controllers/auth/refreshToken.controller");
const { getSessionController } = require("../controllers/auth/getSession.controller");
const protect = require("../middlewares/protect");
const { getMeController } = require("../controllers/getMe.controller");

const { updateAvatar } = require("../controllers/user/avatar.controller");
const { handleUpload } = require("../middlewares/upload");
const router = express.Router();

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Trop de tentatives de connexion.",
  skipSuccessfulRequests: true,
});
const uploadAvatar = handleUpload({
  type: "array",
  config: "avatar",
  folder: "avatars",
  maxFiles: 1,
});
router.post("/login", otpLimiter ,login);
router.get("/resolve-redirect", protect(), resolveRedirect)
router.post("/refresh", refreshToken);
router.post("/logout", LogoutController.logout);
router.post("/logout/all", LogoutController.logout);
router.get("/session", protect(), getSessionController);



router.get("/me", protect(), getMeController);

// POST /user/avatar
router.post("/me/update/avatar", protect(), uploadAvatar, updateAvatar);


module.exports = router;
