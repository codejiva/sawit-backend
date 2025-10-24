// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');

// Import routes
const authRoute = require('./routes/authRoute');

const app = express();
const PORT = process.env.PORT || 5001;

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === DATABASE CONNECTION & SYNC ===
// Fungsi IIFE (Immediately Invoked Function Expression) untuk setup database
(async () => {
    try {
        await connectDB(); // Tes koneksi
        // Sinkronisasi model. 'force: false' berarti tidak akan drop table jika sudah ada.
        // Gunakan 'force: true' hanya di development jika ingin reset database
        await sequelize.sync({ force: false }); 
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Failed to synchronize database:', error);
        process.exit(1); // Keluar jika koneksi DB gagal
    }
})();


// === ROUTES ===
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Welcome to Saw-it Backend API v1"
    });
});

// Gunakan Auth Routes
app.use('/api/v1/auth', authRoute);


// === START SERVER ===
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});