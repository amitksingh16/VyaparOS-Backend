const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
    },
    firebase_uid: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    password: {
        // We ensure a password field exists if staff need to set it via invite
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('owner', 'ca', 'ca_staff', 'ca_article', 'admin'),
        defaultValue: 'owner',
    },
    parent_ca_id: {
        type: DataTypes.UUID,
        allowNull: true, // Only populated for ca_staff or ca_article
    },
    invite_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    invite_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    invite_status: {
        type: DataTypes.ENUM('invited', 'active'),
        defaultValue: 'active',
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    setup_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    firm_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    is_firm_setup_complete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
    tableName: 'users',
});

module.exports = User;
