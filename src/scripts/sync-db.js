const { sequelize } = require('../models');

const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync all models
        // force: true will DROP TABLES and recreate them (use with caution)
        // alter: true will align schema with models
        await sequelize.sync({ alter: true });

        console.log('Database synced successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing database:', err);
        process.exit(1);
    }
};

syncDB();
