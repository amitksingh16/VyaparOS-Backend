const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ClientMeta = sequelize.define('ClientMeta', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    business_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // 1-to-1 relationship
        references: {
            model: 'businesses',
            key: 'id'
        }
    },
    whatsapp_alerts: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    email_digest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    config_data: {
        type: DataTypes.TEXT, // Using TEXT for SQLite JSON fallback if needed
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'client_meta',
});

module.exports = ClientMeta;
