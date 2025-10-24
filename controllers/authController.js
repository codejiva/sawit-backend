// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Fungsi Register
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validasi input sederhana
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
    }

    try {
        // Cek jika email sudah ada
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Buat user baru
        const newUser = await User.create({
            name: name,
            email: email,
            password: hashedPassword,
            role: role || 'User' // Ambil role dari body, atau default 'User'
        });

        // Hapus password dari response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        res.status(201).json({
            message: "User registered successfully",
            user: userResponse
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: "Server error during registration.", error: error.message });
    }
};

// Fungsi Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        // Cari user berdasarkan email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials (email not found)." });
        }

        // Cek password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials (password mismatch)." });
        }

        // Buat JWT Payload
        const payload = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        };

        // Buat dan tandatangani Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }, // Token berlaku 1 hari
            (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    message: "Login successful",
                    token: token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Server error during login.", error: error.message });
    }
};

// GetMe
exports.getMe = async (req, res) => {
    try {
        // req.user sudah di-inject oleh middleware 'protect'
        // Kita tidak perlu query database lagi karena middleware sudah melakukannya
        const user = req.user;

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Response user data (password sudah di-exclude oleh middleware)
        res.status(200).json(user.toJSON());

    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: "Server error retrieving user profile." });
    }
};