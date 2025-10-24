// models/Conversation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'New Chat' // Default title
    }
    // Kolom 'userId' akan ditambahkan secara otomatis oleh Sequelize
    // saat kita mendefinisikan asosiasi
}, {
    tableName: 'conversations',
    timestamps: true
});

module.exports = Conversation;