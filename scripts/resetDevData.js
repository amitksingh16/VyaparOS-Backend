const { sequelize, User, Firm, CAClient, Invitation, Business, StaffClientAssignment, ActivityLog } = require('../src/models/index');

async function resetDatabase() {
    try {
        console.log("Starting environment cleanup...");

        // Disable foreign key checks for SQLite if needed (though usually fine for delete all)
        await sequelize.query('PRAGMA foreign_keys = OFF');

        // Destroy data across relevant tables
        await ActivityLog.destroy({ where: {}, truncate: true, cascade: true });
        await StaffClientAssignment.destroy({ where: {}, truncate: true, cascade: true });
        await CAClient.destroy({ where: {}, truncate: true, cascade: true });
        await Invitation.destroy({ where: {}, truncate: true, cascade: true });
        await Business.destroy({ where: {}, truncate: true, cascade: true });
        await Firm.destroy({ where: {}, truncate: true, cascade: true });
        await User.destroy({ where: {}, truncate: true, cascade: true });

        // Re-enable foreign key checks
        await sequelize.query('PRAGMA foreign_keys = ON');

        console.log("Cleanup complete. Ready for fresh Demo testing.");
        process.exit(0);
    } catch (error) {
        console.error("Failed to clean database:", error);
        process.exit(1);
    }
}

resetDatabase();
