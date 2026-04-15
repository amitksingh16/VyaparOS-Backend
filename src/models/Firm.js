const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Firm = sequelize.define('Firm', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
    },
    pan: {
        type: DataTypes.STRING,
    },
    gst: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.TEXT,
    },
    owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
    }
}, {
    timestamps: true,
    tableName: 'firms',
});

module.exports = Firm;
