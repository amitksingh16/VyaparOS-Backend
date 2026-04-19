const { sequelize } = require('../config/db');
const User = require('./User');
const Business = require('./Business');
const ComplianceItem = require('./ComplianceItem');
const Document = require('./Document');
const Reminder = require('./Reminder');
const Notification = require('./Notification');
const CAClient = require('./CAClient');
const NotificationLog = require('./NotificationLog');
const StaffClientAssignment = require('./StaffClientAssignment');
const ActivityLog = require('./ActivityLog');
const Invitation = require('./Invitation');
const ClientMeta = require('./ClientMeta');
const Firm = require('./Firm');

// Relationships---

// Firm & User (Owner)
Firm.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasOne(Firm, { foreignKey: 'owner_id', as: 'owned_firm' }); // A user owns a firm

// User & Firm (Firm membership)
User.belongsTo(Firm, { foreignKey: 'firm_id', as: 'firm' });
Firm.hasMany(User, { foreignKey: 'firm_id', as: 'members' });

// Business & ClientMeta (Settings)
Business.hasOne(ClientMeta, { foreignKey: 'business_id', as: 'client_meta' });
ClientMeta.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// User & Business (Owner)
User.hasMany(Business, { foreignKey: 'owner_id', as: 'businesses' });
Business.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// CA & Business (CA Client)
User.belongsToMany(Business, { through: CAClient, foreignKey: 'ca_id', as: 'clients' });
Business.belongsToMany(User, { through: CAClient, foreignKey: 'business_id', as: 'cas' });

// CA Staff/Article & Business (Assigned Clients)
User.belongsToMany(Business, { through: StaffClientAssignment, foreignKey: 'staff_id', as: 'assigned_clients' });
Business.belongsToMany(User, { through: StaffClientAssignment, foreignKey: 'business_id', as: 'assigned_staff' });
Business.belongsTo(User, { foreignKey: 'added_by_staff_id', as: 'added_by_staff' });

// CA Owner to Staff Relationship (Parent CA)
User.hasMany(User, { foreignKey: 'parent_ca_id', as: 'team_members' });
User.belongsTo(User, { foreignKey: 'parent_ca_id', as: 'parent_ca' });

// User (CA) & Invitation
User.hasMany(Invitation, { foreignKey: 'ca_id', as: 'invitations' });
Invitation.belongsTo(User, { foreignKey: 'ca_id', as: 'ca_firm' });

// Business & Compliance
Business.hasMany(ComplianceItem, { foreignKey: 'business_id', as: 'compliance_items' });
ComplianceItem.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business & Document
Business.hasMany(Document, { foreignKey: 'business_id', as: 'documents' });
Document.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Compliance & Document
ComplianceItem.hasMany(Document, { foreignKey: 'compliance_item_id', as: 'evidence' });
Document.belongsTo(ComplianceItem, { foreignKey: 'compliance_item_id', as: 'compliance_item' });

// User & Document (Uploader)
User.hasMany(Document, { foreignKey: 'uploaded_by', as: 'uploaded_documents' });
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// User & Document (Receiver Staff for Unidentified Docs)
User.hasMany(Document, { foreignKey: 'receiver_staff_id', as: 'received_unidentified_docs' });
Document.belongsTo(User, { foreignKey: 'receiver_staff_id', as: 'receiver_staff' });

// User & Reminder
User.hasMany(Reminder, { foreignKey: 'user_id', as: 'reminders' });
Reminder.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Compliance & Reminder
ComplianceItem.hasMany(Reminder, { foreignKey: 'compliance_item_id', as: 'reminders' });
Reminder.belongsTo(ComplianceItem, { foreignKey: 'compliance_item_id', as: 'compliance_item' });

// User & Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Compliance & User (Filed By)
User.hasMany(ComplianceItem, { foreignKey: 'filed_by', as: 'filed_compliances' });
ComplianceItem.belongsTo(User, { foreignKey: 'filed_by', as: 'filer' });

// Business & ActivityLog
Business.hasMany(ActivityLog, { foreignKey: 'client_id', as: 'activity_logs' });
ActivityLog.belongsTo(Business, { foreignKey: 'client_id', as: 'business' });

// User & ActivityLog
User.hasMany(ActivityLog, { foreignKey: 'performed_by', as: 'activity_logs' });
ActivityLog.belongsTo(User, { foreignKey: 'performed_by', as: 'user' });

// Business & NotificationLog
Business.hasMany(NotificationLog, { foreignKey: 'business_id', as: 'notification_logs' });
NotificationLog.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// ComplianceItem & NotificationLog
ComplianceItem.hasMany(NotificationLog, { foreignKey: 'compliance_id', as: 'notification_logs' });
NotificationLog.belongsTo(ComplianceItem, { foreignKey: 'compliance_id', as: 'compliance_item' });

module.exports = {
    sequelize,
    User,
    Business,
    ComplianceItem,
    Document,
    Reminder,
    Notification,
    CAClient,
    ActivityLog,
    NotificationLog,
    StaffClientAssignment,
    Invitation,
    ClientMeta,
    Firm
};
// code endes here//