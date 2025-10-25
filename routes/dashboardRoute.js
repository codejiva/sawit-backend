// routes/dashboardRoute.js
const express = require('express');
const router = express.Router();
const { getSpasialData, getSummaryData, getTrendData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET api/v1/dashboard/spasial
// @desc    Mengambil data GeoJSON untuk peta dashboard
// @access  Private
router.get('/spasial', protect, getSpasialData);

// @route   GET api/v1/dashboard/summary
// @desc    Mengambil data summary untuk cards NDVI
// @access  Private
router.get('/summary', protect, getSummaryData);

// @route   GET api/v1/dashboard/tren
// @desc    Mengambil data untuk chart tren produksi
// @access  Private
router.get('/tren', protect, getTrendData);


module.exports = router;