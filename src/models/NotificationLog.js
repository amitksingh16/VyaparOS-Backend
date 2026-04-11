const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const NotificationLog = sequelize.define('NotificationLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    business_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    compliance_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    channel: {
        type: DataTypes.ENUM('whatsapp', 'email', 'dashboard_alert'),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('digest', 'urgent', 'critical', 'deadline', 'escalation'),
        allowNull: false,
    },
    is_opened: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    timestamps: true,
    tableName: 'notification_logs',
});

module.exports = NotificationLog;
