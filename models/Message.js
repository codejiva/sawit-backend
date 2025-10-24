// models/Message.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'model'), // 'user' (kita) atau 'model' (AI)
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT, // Pakai TEXT biar muat panjang
        allowNull: false
    }
    // Kolom 'conversationId' akan ditambahkan secara otomatis
    // saat kita mendefinisikan asosiasi
}, {
    tableName: 'messages',
    timestamps: true
});

module.exports = Message;