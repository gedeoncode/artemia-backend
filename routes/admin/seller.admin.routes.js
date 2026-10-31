const express = require('express');
const router = express.Router();
const {
  getAllSellers,
  updateSellerStatus,
  getSellerDocuments,
  blockSeller,
  unblockSeller,
  getSeller,
} = require("../../controllers/admin/seller.admin.controller");
const protect = require('../../middlewares/protect');
const { requireAdmin } = require('../../middlewares/admin.middleware');
// getSeller, approveSeller, rejectSeller, deleteSeller 
// const auth = require('../../middlewares/auth');
// const isAdmin = require('../../middlewares/isAdmin');

router.use(
  protect(["admin"]),
  requireAdmin
);
// router.use(auth, isAdmin);
router.get('/', getAllSellers);
router.get("/:id/documents", getSellerDocuments);
router.get('/:id', getSeller);
router.put("/:id/status", updateSellerStatus);
router.put('/:id/block', blockSeller);
router.put('/:id/unblock', unblockSeller);

module.exports = router;