// models/Prediksi.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Prediksi = sequelize.define('Prediksi', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    bulan: {
        type: DataTypes.DATEONLY, // Bulan prediksi (YYYY-MM-01)
        allowNull: false
    },
    prediksi_ton_per_ha: {
        type: DataTypes.FLOAT, // Hasil angka dari API Python
        allowNull: false
    },
    aktual_ton_per_ha: {
        type: DataTypes.FLOAT, // Diisi nanti jika data aktual masuk
        allowNull: true
    },
    akurasi: {
        type: DataTypes.FLOAT, // Hasil perhitungan (aktual / prediksi) * 100
        allowNull: true
    },
    status_prediksi: {
        type: DataTypes.STRING, // Misal: 'Selesai', 'Menunggu Aktual'
        allowNull: true
    }
    // Kolom 'lahanId' akan ditambahkan oleh Sequelize
}, {
    tableName: 'prediksi',
    timestamps: true // Kapan prediksi ini dibuat/diupdate
});

module.exports = Prediksi;