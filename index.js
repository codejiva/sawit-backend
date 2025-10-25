// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');

// Import routes
const authRoute = require('./routes/authRoute');
const palmAiRoute = require('./routes/palmAiRoute');
const lahanRoute = require('./routes/lahanRoute')
const estimasiRoutes = require('./routes/estimasiRoute')
const dashboardRoutes = require('./routes/dashboardRoute')


// Models
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Lahan = require('./models/Lahan')
const DataHistoris = require('./models/DataHistoris')
const Prediksi = require('./models/Prediksi')

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

// 1 Lahan punya BANYAK DataHistoris
Lahan.hasMany(DataHistoris, { foreignKey: 'lahanId' }); 
DataHistoris.belongsTo(Lahan, { foreignKey: 'lahanId' }); 

// 1 User (misal manager) bertanggung jawab atas BANYAK Lahan
User.hasMany(Lahan, { foreignKey: 'userId' }); 
Lahan.belongsTo(User, { foreignKey: 'userId' }); 

// 1 Lahan punya BANYAK Prediksi
Lahan.hasMany(Prediksi, { foreignKey: 'lahanId' }); 
Prediksi.belongsTo(Lahan, { foreignKey: 'lahanId' }); 

// === DATABASE CONNECTION & SYNC ===
(async () => {
    try {
        await connectDB(); 
        
        await sequelize.sync({ force: false }); 
        
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Failed to synchronize database:', error);
        process.exit(1);
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
app.use('/api/v1/lahan', lahanRoute)
app.use('/api/v1/estimasi', estimasiRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});