// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');

// Import routes
const authRoute = require('./routes/authRoute');
const palmAiRoute = require('./routes/palmAiRoute');


// Models
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const app = express();
const PORT = process.env.PORT || 5001;

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === DEFINISI ASOSIASI DATABASE ===
// 1 User punya BANYAK Conversation
User.hasMany(Conversation, { foreignKey: 'userId' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

// 1 Conversation punya BANYAK Message
Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

// === DATABASE CONNECTION & SYNC ===
// Fungsi IIFE (Immediately Invoked Function Expression) untuk setup database
(async () => {
    try {
        await connectDB(); // Tes koneksi
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

app.use('/api/v1/auth', authRoute);
app.use('/api/v1/palm-ai', palmAiRoute);

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});