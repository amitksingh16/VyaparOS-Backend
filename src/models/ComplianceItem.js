const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ComplianceItem = sequelize.define('ComplianceItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    compliance_type: {
        type: DataTypes.ENUM('gstr1', 'gstr3b', 'gstr9', 'itr', 'tds', 'audit9c'),
        allowNull: false,
    },
    frequency: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'annually'),
        allowNull: false,
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'pending', 'filed', 'overdue', 'waived'),
        defaultValue: 'upcoming',
    },
    filed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'compliance_items',
});

module.exports = ComplianceItem;
