const { sequelize, User, Firm, CAClient, Invitation, Business, StaffClientAssignment, ActivityLog } = require('../src/models/index');

async function resetDatabase() {
    try {
        console.log("Starting environment cleanup and schema update...");

        // Disable foreign key checks for SQLite
        await sequelize.query('PRAGMA foreign_keys = OFF');

        // FORCE: TRUE drops all tables and recreates them. 
        // This ensures new columns like 'mobile_number' and 'gstin' are created in the Firm table.
        console.log("Dropping old tables and syncing new schema...");
        await sequelize.sync({ force: true });

        // Re-enable foreign key checks
        await sequelize.query('PRAGMA foreign_keys = ON');

        console.log("✅ BOOM! Database wiped & schema updated. Ready for fresh CA Onboarding testing.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to clean and sync database:", error);
        process.exit(1);
    }
}

resetDatabase();