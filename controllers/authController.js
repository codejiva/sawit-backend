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

exports.updateProfile = async (req, res) => {
    // Ambil field yang boleh di-update dari body
    // Kita ambil juga 'name' (Nama Lengkap)
    const { firstName, lastName, phone, company, name, role } = req.body;

    try {
        // req.user didapat dari middleware 'protect'
        const user = req.user; 

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Update field-field di objek user
        // Kita pakai || user.field untuk memastikan data lama tidak hilang jika field tidak dikirim
        user.name = name || user.name;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.phone = phone || user.phone;
        user.company = company || user.company;
        
        // Cek jika 'role' ada di body.
        // harusnya yang boleh ganti role admin aja
        // tapi sekarang gue biarin dulu aja ya
        if (role) {
            user.role = role;
        }

        // Simpan perubahan ke database
        await user.save();

        // Kirim balik data user yang sudah ter-update
        res.status(200).json(user.toJSON());

    } catch (error) {
        console.error('UpdateProfile error:', error);
        res.status(500).json({ message: "Server error updating user profile." });
    }
};

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Validasi input
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Password lama dan password baru wajib diisi." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password baru minimal harus 6 karakter." });
    }

    try {
        // req.user didapat dari middleware 'protect', tapi TIDAK TERMASUK password.
        // Kita harus fetch ulang user dari DB untuk bisa membandingkan password.
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Bandingkan 'oldPassword' dari body dengan password di database
        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Password lama salah." });
        }

        // Hash password baru
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password di database
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password berhasil diubah." });

    } catch (error) {
        console.error('ChangePassword error:', error);
        res.status(500).json({ message: "Server error updating password." });
    }
};