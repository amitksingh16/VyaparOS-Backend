const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Reminder = sequelize.define('Reminder', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    channel: {
        type: DataTypes.ENUM('email', 'whatsapp', 'in_app'),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending',
    },
}, {
    timestamps: false,
    tableName: 'reminders',
});

module.exports = Reminder;
