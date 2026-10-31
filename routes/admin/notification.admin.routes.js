const express = require('express');
const { getNotifications, markNotificationRead } = require('../../controllers/admin/notification.admin.controller');
const protect = require('../../middlewares/protect');
const { requireAdmin } = require('../../middlewares/admin.middleware');
// const auth = require('../../middlewares/auth');

const router = express.Router();


router.use(
  protect(["admin"]),
  requireAdmin
);
router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
