// routes/authRoute.js
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/v1/auth/me
// @desc    Get current logged in user profile
// @access  Private (butuh token)
router.get('/me', protect, getMe);

// @route   PUT api/v1/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   POST api/v1/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, changePassword);

module.exports = router;