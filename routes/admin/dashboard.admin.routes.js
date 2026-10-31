const express = require('express');
const { getAdminDashboard } = require('../../controllers/admin/dashboard.admin.controller');
const { requireAdmin } = require('../../middlewares/admin.middleware');
const protect = require('../../middlewares/protect');
// const auth = require('../../middlewares/auth');
// const isAdmin = require('../../middlewares/isAdmin');

const router = express.Router();
router.use(
  protect(["admin"]),
  requireAdmin
);
// router.use( isAdmin);
router.get('/', getAdminDashboard);
module.exports = router;
