const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Placeholder for database connection
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
    } catch (err) {
        console.error('Unable to connect to the database:', err);
        // process.exit(1); // Optional: exit if DB is critical
    }
};

module.exports = { sequelize, connectDB };
