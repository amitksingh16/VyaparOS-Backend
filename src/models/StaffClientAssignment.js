const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StaffClientAssignment = sequelize.define('StaffClientAssignment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    staff_id: {
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
    timestamps: true,
    tableName: 'staff_client_assignments',
    indexes: [
        {
            unique: true,
            fields: ['staff_id', 'business_id']
        }
    ]
});

module.exports = StaffClientAssignment;
