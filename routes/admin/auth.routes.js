const express = require('express');
const router = express.Router();
const {
  getAllAdmins,
  registerAdmin,
  getAdminById,
  updateAdminRole,
  deleteAdmin,
} = require("../../controllers/admin/auth.controller");


router.get("/", getAllAdmins);
router.post("/", registerAdmin);
// router.get("/:id", getAdminById);
router.put("/:id/role", updateAdminRole);
router.delete("/:id", deleteAdmin);
module.exports = router;
