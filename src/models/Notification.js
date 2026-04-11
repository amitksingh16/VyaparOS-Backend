const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('reminder', 'alert', 'update'),
        defaultValue: 'update',
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
    tableName: 'notifications',
});

module.exports = Notification;
