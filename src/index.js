const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin globally
require('./config/firebaseAdmin');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// 🚀 BULLETPROOF CORS SETUP
const corsOptions = {
    origin: [
        'https://vyaparos-frontend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173'
    ], // Localhost bhi add kar diya future testing ke liye
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Legacy browsers ke liye
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Har route par preflight request allow karega

app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const caRoutes = require('./routes/caRoutes');
const caTeamRoutes = require('./routes/caTeamRoutes');
const documentRoutes = require('./routes/documentRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const actionRoutes = require('./routes/actionRoutes');
const firmRoutes = require('./routes/firm.routes');
const onboardingRoutes = require('./routes/onboardingRoutes');

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/ca/team', caTeamRoutes);
app.use('/api/team', caTeamRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/firm', firmRoutes);
app.use('/api/onboarding', onboardingRoutes);

const cron = require('node-cron');
const { runDailyReminders } = require('./utils/reminderEngine');

app.get('/', (req, res) => {
    res.send('Backend is Alive');
});

// Intelligent Reminder System: Run daily at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Executing scheduled daily reminder engine...');
    await runDailyReminders();
});

const startServer = async () => {
    try {
        const { sequelize, databaseStorage } = require('./config/db');

        // Connection Check
        await sequelize.authenticate();
        console.log('[DB] Connection established successfully.');

        // 🔥 STEP 1: Wipe database properly for fresh onboarding
        // Isse SQLite tables ekdum nayi banengi
        console.log('[DB] SYNC: Wiping and recreating tables...');
        await sequelize.sync({ force: true });

        // Deep Database Sync: Cleanup orphaned assignments
        console.log('[SYNC] Cleaning up database...');
        await sequelize.query(`
            DELETE FROM staff_client_assignments 
            WHERE business_id NOT IN (SELECT id FROM businesses)
        `).catch(e => console.log("Init cleanup skipped"));

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log('✅ Fresh Database Ready for Onboarding.');
        });

        return server;
    } catch (err) {
        console.error('Failed to start server:', err);
        throw err;
    }
};

module.exports = { app, startServer };
// Triggering rebuild to wipe SQLite database for testing onboarding flow.
