// routes/estimasiRoute.js
const express = require('express');
const router = express.Router();
const { createDummyPrediksi } = require('../controllers/estimasiController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/v1/estimasi/dummy
// @desc    Membuat data prediksi dummy (HANYA development)
// @access  Private
router.post('/dummy', protect, createDummyPrediksi);

// --- (Nanti kita tambahkan route GET /summary dan GET /history di sini) ---


module.exports = router;