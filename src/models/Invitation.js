const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invitation = sequelize.define('Invitation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ca_staff', 'ca_article'),
        allowNull: false
    },
    assigned_clients_json: {
        type: DataTypes.TEXT, // Stored as stringified JSON
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'expired'),
        defaultValue: 'pending',
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    ca_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    firm_name: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'invitations',
    timestamps: true,
});

module.exports = Invitation;
