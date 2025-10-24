// routes/palmAiRoute.js
const express = require('express');
const router = express.Router();
const { postNewChat, getChatHistory, getChatMessages } = require('../controllers/palmAiController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/v1/palm-ai/chat
// @desc    Kirim prompt baru atau lanjutan
// @access  Private
router.post('/chat', protect, postNewChat);

// @route   GET api/v1/palm-ai/history
// @desc    Ambil semua judul/list percakapan
// @access  Private
router.get('/history', protect, getChatHistory);

// @route   GET api/v1/palm-ai/history/:id
// @desc    Ambil semua isi pesan dari 1 percakapan
// @access  Private
router.get('/history/:id', protect, getChatMessages);


module.exports = router;