const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Business = sequelize.define('Business', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    business_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    primary_mobile: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    primary_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    whatsapp_mobile: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    secondary_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    pan: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    pan_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    gstin: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    gst_number: {
        type: DataTypes.STRING(25),
        allowNull: true,
    },
    business_type: {
        type: DataTypes.ENUM('prop', 'llp', 'pvt_ltd', 'partnership', 'opc'),
        defaultValue: 'prop',
    },
    state: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    turnover: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
    },
    filing_type: {
        type: DataTypes.ENUM('monthly', 'qrmp'),
        defaultValue: 'monthly',
    },
    whatsapp_alerts: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    email_digest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    added_by_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'businesses',
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['primary_mobile']
        },
        {
            fields: ['whatsapp_mobile']
        }
    ]
});

module.exports = Business;
