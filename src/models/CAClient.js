const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CAClient = sequelize.define('CAClient', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending'),
        defaultValue: 'pending',
    },
    assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    ca_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    business_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'businesses',
            key: 'id'
        }
    }
}, {
    timestamps: false,
    tableName: 'ca_clients',
});

module.exports = CAClient;
