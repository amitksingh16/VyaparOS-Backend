const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin globally
require('./config/firebaseAdmin');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Railway/Cloud environments ke liye proxy trust enable karna zaroori hai
app.set('trust proxy', 1);

// 🚀 BULLETPROOF CORS SETUP
const corsOptions = {
    origin: [
        'https://vyaparos-frontend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Routes
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
const { User, Invitation } = require('./models'); // Models import kar liye
const { Op } = require('sequelize');

// Intelligent Reminder & Auto-Cleanup System: Run daily at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Executing scheduled daily engine...');

    // 1. Send Reminders
    await runDailyReminders();

    // 2. Auto-Cleanup Expired Invitations & Invited Users
    try {
        console.log('[CRON] Cleaning up expired invitations...');
        const now = new Date();

        // Expired invitations delete karo
        await Invitation.destroy({
            where: {
                status: 'pending',
                expires_at: { [Op.lt]: now } // Jo aaj ki date se chote hain (expire ho gaye)
            }
        });

        // Wo staff data delete karo jo verify nahi hue aur expire ho gaye
        await User.destroy({
            where: {
                invite_status: 'invited',
                invite_expiry: { [Op.lt]: now }
            }
        });
        console.log('[CRON] Cleanup successful. CA can now resend invites.');
    } catch (err) {
        console.error('[CRON] Cleanup failed:', err);
    }
});
const startServer = async () => {
    try {
        const { sequelize, databaseStorage } = require('./config/db');

        await sequelize.authenticate();
        console.log('[DB] Connection established successfully.');

        // 🔥 CRITICAL: Force Sync temporarily to wipe data
        console.log('[DB] SYNC: Wiping and recreating tables...');
        await sequelize.sync({ alter: true });

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

        return server;
    } catch (err) {
        console.error('Failed to start server:', err);
        throw err;
    }
};

// Railway automatically calls the export if configured, or we run it here
if (require.main === module) {
    startServer().catch((err) => {
        console.error("Startup Crash:", err);
        process.exit(1);
    });
}

module.exports = { app, startServer };