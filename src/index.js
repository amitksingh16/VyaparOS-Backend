const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin globally
require('./config/firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.options('*', cors());
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
        const { sequelize } = require('./config/db');
        
        // Ensure connection is established
        await sequelize.authenticate();
        console.log('[DB] Connection established successfully.');
        
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

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log("✅ Backend running without Firebase (Step 1 clean)");
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();
