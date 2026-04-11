const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Untitled Document'
    },
    size: {
        type: DataTypes.INTEGER, // Size in bytes
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING(50), // e.g., 'GST Purchase', 'GST Sales', 'Bank Statements', 'Other'
        allowNull: false,
        defaultValue: 'Other'
    },
    file_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    month: {
        type: DataTypes.STRING(7), // YYYY-MM
        allowNull: true,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    sender_mobile: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    receiver_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'documents',
    updatedAt: false,
    createdAt: 'uploaded_at',
});

module.exports = Document;
