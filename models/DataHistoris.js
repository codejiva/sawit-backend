// models/DataHistoris.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Model ini untuk nyimpen data time-series per lahan
const DataHistoris = sequelize.define('DataHistoris', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    bulan: {
        type: DataTypes.DATEONLY, // Hanya nyimpen TANGGAL (YYYY-MM-DD)
        allowNull: false
    },
    // Fitur numerik yang dibutuhin model Python
    NDVI: { type: DataTypes.FLOAT, allowNull: false },
    pupuk_kg_per_ha: { type: DataTypes.FLOAT, allowNull: false },
    umur_tanaman_tahun: { type: DataTypes.FLOAT, allowNull: false },
    curah_hujan_mm: { type: DataTypes.FLOAT, allowNull: false },
    suhu_rata2_c: { type: DataTypes.FLOAT, allowNull: false },
    
    // Ini adalah 'Y' atau target aslinya (buat evaluasi nanti)
    produktivitas_ton_per_ha: { 
        type: DataTypes.FLOAT, 
        allowNull: false 
    }
    // Kolom 'lahanId' akan ditambahkan oleh Sequelize
}, {
    tableName: 'data_historis',
    timestamps: true
});

module.exports = DataHistoris;