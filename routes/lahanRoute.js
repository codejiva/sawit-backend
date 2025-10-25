// routes/lahanRoute.js
const express = require('express');
const router = express.Router();
const { createDummyLahan, predictLahan, getAllLahan, addDummyGeometry } = require('../controllers/lahanController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/v1/lahan/dummy
// @desc    Membuat data lahan & historis dummy (HANYA development)
// @access  Private
router.post('/dummy', protect, createDummyLahan);

// @route   GET api/v1/lahan/:id/predict
// @desc    Mendapatkan prediksi produktivitas untuk 1 lahan
// @access  Private
router.get('/:id/predict', protect, predictLahan);

// @route   GET api/v1/lahan
// @desc    Mendapatkan daftar semua lahan milik user
// @access  Private
router.get('/', protect, getAllLahan);

// @route   POST api/v1/lahan/dummy-geometry
// @desc    Menambah dummy geometry ke lahan (HANYA development)
// @access  Private
router.post('/dummy-geometry', protect, addDummyGeometry);


module.exports = router;