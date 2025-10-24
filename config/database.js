// config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Ambil connection string dari .env
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set.');
    process.exit(1);
}

// Inisialisasi Sequelize
const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Set ke console.log kalau mau lihat query SQL
    dialectOptions: {
        // Aktifkan SSL jika terhubung ke database production (misal: Vercel, Heroku)
        // ssl: {
        //     require: true,
        //     rejectUnauthorized: false 
        // }
    }
});

// Fungsi untuk tes koneksi
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

module.exports = { sequelize, connectDB };