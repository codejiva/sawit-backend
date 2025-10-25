// routes/dashboardRoute.js
const express = require('express');
const router = express.Router();
const { getSpasialData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET api/v1/dashboard/spasial
// @desc    Mengambil data GeoJSON untuk peta dashboard
// @access  Private
router.get('/spasial', protect, getSpasialData);

// --- (Nanti kita tambahkan route GET /summary dan GET /tren di sini) ---


module.exports = router;