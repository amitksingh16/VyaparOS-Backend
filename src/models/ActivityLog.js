const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    client_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    event_type: {
        type: DataTypes.ENUM(
            'COMPLIANCE_MARKED_FILED',
            'COMPLIANCE_MARKED_PENDING',
            'CLIENT_CREATED',
            'CLIENT_UPDATED',
            'USER_LOGIN'
        ),
        allowNull: false,
    },
    event_reference: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    performed_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
    }
}, {
    timestamps: true, // we still keep Sequelize timestamps for createdAt/updatedAt just in case
    tableName: 'activity_logs',
});

module.exports = ActivityLog;
