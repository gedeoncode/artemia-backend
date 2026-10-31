const express = require('express');
const {
  getAllUsers,
  blockUser,
  unblockUser,
  deleteUser
} = require('../../controllers/admin/user.admin.controller');

// const auth = require('../../middlewares/auth');

const router = express.Router();

// router.use(auth, isAdmin);

router.get('/', getAllUsers);
router.put('/:id/block', blockUser);
router.put('/:id/unblock', unblockUser);
router.delete('/:id', deleteUser);

module.exports = router;
