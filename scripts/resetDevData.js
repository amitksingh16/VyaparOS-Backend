const { sequelize } = require('../src/models');

async function resetDatabase() {
    try {
        // Execute DELETE FROM on the requested tables.
        // We use try-catch for each in case a table (like ca_profiles) doesn't exist.
        const tables = ['users', 'ca_profiles', 'firms'];

        for (const table of tables) {
            try {
                await sequelize.query(`DELETE FROM ${table};`);
            } catch (err) {
                // Ignore error if table doesn't exist, just log it.
                console.log(`Note: Could not clear ${table} (it might not exist): ${err.message}`);
            }
        }

        console.log("Database Cleaned Successfully! Ready for Onboarding Testing.");
        process.exit(0);
    } catch (error) {
        console.error("Failed to clean database:", error);
        process.exit(1);
    }
}

resetDatabase();
