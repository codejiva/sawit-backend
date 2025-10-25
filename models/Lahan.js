// models/Lahan.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Model ini untuk nyimpen info statis/kategorikal sebuah lahan
const Lahan = sequelize.define('Lahan', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Fitur kategorikal yang dibutuhin model Python
    penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Tim A'
    },
    jenis_tanah: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Alluvial'
    },
    sistem_irigasi: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Tanpa Irigasi'
    },
    lahan_kabupaten: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Kampar'
    },
    // Info lat/lon dari script asli
    lat: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    lon: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    tableName: 'lahan',
    timestamps: true
});

module.exports = Lahan;