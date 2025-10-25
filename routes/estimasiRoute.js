// routes/estimasiRoute.js
const express = require('express');
const router = express.Router();
const { createDummyPrediksi, getEstimasiSummary, getEstimasiHistory } = require('../controllers/estimasiController');
const { protect } = require('../middleware/authMiddleware');

// ... (route POST /dummy) ...
router.post('/dummy', protect, createDummyPrediksi);

// @route   GET api/v1/estimasi/summary
// @desc    Mengambil data summary untuk cards estimasi
// @access  Private
router.get('/summary', protect, getEstimasiSummary);

// @route   GET api/v1/estimasi/history
// @desc    Mengambil data history estimasi untuk tabel (dengan filter)
// @access  Private
router.get('/history', protect, getEstimasiHistory);


module.exports = router;