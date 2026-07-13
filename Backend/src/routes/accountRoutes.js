const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const accountController = require('../controllers/accountController');

router.use(requireAuth);

// Hapus akun (user) + cascade toko & simulasi
router.delete('/me', accountController.deleteAccount);

// Hapus toko default user saja
router.delete('/store/default', accountController.deleteDefaultStore);

module.exports = router;

