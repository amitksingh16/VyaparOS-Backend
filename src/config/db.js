const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
const databaseStorage = process.env.SQLITE_STORAGE_PATH
    || (isRailway ? '/tmp/database.sqlite' : path.resolve(process.cwd(), 'database.sqlite'));

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databaseStorage,
    logging: false,
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Database connected successfully using ${databaseStorage}.`);
    } catch (err) {
        console.error('Unable to connect to the database:', err);
        // process.exit(1); // Optional: exit if DB is critical
    }
};

module.exports = { sequelize, connectDB, databaseStorage };
