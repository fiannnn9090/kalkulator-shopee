const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/authMiddleware');

// Autocomplete kategori/jenis produk (butuh login untuk menjaga konsistensi dan
// mencegah akses publik tanpa batas).
router.use(requireAuth);

// GET /api/categories/suggestions?q=...&limit=10&status=non-star|star|mall
router.get('/suggestions', categoryController.getSuggestions);

module.exports = router;

