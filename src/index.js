const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin globally
require('./config/firebaseAdmin');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

const ALLOWED_ORIGIN = 'https://vyaparos-frontend.vercel.app';

app.use(cors({
    origin: ALLOWED_ORIGIN,
    credentials: true
}));

app.options(ALLOWED_ORIGIN, cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const caRoutes = require('./routes/caRoutes');
const caTeamRoutes = require('./routes/caTeamRoutes');
const documentRoutes = require('./routes/documentRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const actionRoutes = require('./routes/actionRoutes');

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/ca/team', caTeamRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/actions', actionRoutes);

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

        // Ensure connection is established
        await sequelize.authenticate();
        console.log('[DB] Connection established successfully.');
        console.log(`[DB] SQLite storage path: ${databaseStorage}`);

        // Force table alteration/creation temporarily for deployment
        console.log('[DB] Syncing models to database...');
        await sequelize.sync({ alter: true });

        // Deep Database Sync: Cleanup orphaned staff_client_assignments
        console.log('[SYNC] Cleaning up orphaned client assignments...');
        await sequelize.query(`
            DELETE FROM staff_client_assignments
            WHERE business_id NOT IN (SELECT id FROM businesses)
        `);
        console.log('[SYNC] Cleanup complete.');

        // Wipe specific user for re-onboarding from SQLite
        console.log('[SYNC] Removing test user data for 9554140800 & 7905849970...');
        try {
            await sequelize.query(`
                DELETE FROM users
                WHERE email='singh.amitk82@gmail.com' OR phone='9554140800' OR phone='7905849970'
            `);
            console.log('[SYNC] Test user data removed successfully.');
        } catch(err) {
            console.warn('[SYNC] Notice: ', err.message);
        }

        // Wipe specific users from Firebase Authentication
        const admin = require('./config/firebaseAdmin');
        try {
            const phones = ['+919554140800', '+917905849970'];
            for (const phone of phones) {
                try {
                    const userRecord = await admin.auth().getUserByPhoneNumber(phone);
                    await admin.auth().deleteUser(userRecord.uid);
                    console.log(`[SYNC] Firebase user ${phone} removed successfully.`);
                } catch (e) {
                    if (e.code !== 'auth/user-not-found') {
                        console.warn(`[SYNC] Notice for Firebase auth deletion of ${phone}: `, e.message);
                    }
                }
            }
        } catch(err) {
            console.warn('[SYNC] Firebase Admin user deletion notice: ', err.message);
        }

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Backend boot complete.');
        });

        return server;
    } catch (err) {
        console.error('Failed to start server:', err);
        throw err;
    }
};

if (require.main === module) {
    startServer().catch(() => {
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };
