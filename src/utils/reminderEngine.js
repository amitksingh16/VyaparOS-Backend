const { ComplianceItem, Business, NotificationLog } = require('../models');
const { Op } = require('sequelize');

const runDailyReminders = async () => {
    try {
        console.log("--- Starting Intelligent Reminder Engine ---");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch all pending compliances directly mapped to business configurations
        const pendingItems = await ComplianceItem.findAll({
            where: {
                status: { [Op.in]: ['upcoming', 'pending', 'overdue'] }
            },
            include: [{
                model: Business,
                as: 'business',
                attributes: ['id', 'business_name', 'whatsapp_alerts', 'email_digest']
            }]
        });

        let generatedLogs = 0;

        for (const item of pendingItems) {
            const dueDate = new Date(item.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const daysDifference = Math.floor((dueDate - today) / (1000 * 3600 * 24));
            const business = item.business;

            // Normalize Compliance name nicely for message mapping
            const cleanType = item.compliance_type.toUpperCase() === 'GSTR3B' ? 'GSTR-3B' :
                item.compliance_type.toUpperCase() === 'GSTR1' ? 'GSTR-1' :
                    item.compliance_type.toUpperCase() === 'AUDIT9C' ? 'GST Audit (9C)' :
                        item.compliance_type.toUpperCase();

            // Default base condition evaluations
            let triggerType = null;
            let channelConfig = [];

            // 1. T-Minus System
            if (daysDifference === 15) triggerType = 'digest';
            else if (daysDifference === 7) triggerType = 'urgent';
            else if (daysDifference === 3) triggerType = 'critical';
            else if (daysDifference === 0) triggerType = 'deadline';
            else if (daysDifference <= -1 && item.status === 'overdue') triggerType = 'escalation';

            if (!triggerType) continue;

            // 2. Format the simulated Message Payload
            let message = "";
            if (triggerType === 'escalation') {
                message = `${business.business_name} has not responded to 3 reminders for ${cleanType}.`;
                channelConfig.push('dashboard_alert');
            } else {
                message = `Dear ${business.business_name}, your ${cleanType} is due in ${daysDifference === 0 ? '0' : daysDifference} days. Please upload documents.`;
                if (business.whatsapp_alerts) channelConfig.push('whatsapp');
                if (business.email_digest) channelConfig.push('email');
            }

            // 3. Database Injection (Log)
            for (const ch of channelConfig) {
                // Prevent duplicate same-day same-type channel configs
                const existingLog = await NotificationLog.findOne({
                    where: {
                        compliance_id: item.id,
                        type: triggerType,
                        channel: ch
                    }
                });

                if (!existingLog) {
                    await NotificationLog.create({
                        business_id: business.id,
                        compliance_id: item.id,
                        message: message,
                        channel: ch,
                        type: triggerType
                    });

                    console.log(`[Sent ${ch.toUpperCase()}] > ${message}`);
                    generatedLogs++;
                }
            }
        }

        console.log(`--- Engine Complete: ${generatedLogs} Alerts Triggered ---`);
        return { success: true, count: generatedLogs };

    } catch (error) {
        console.error("Reminder Engine Failed:", error);
        return { success: false, error: error.message };
    }
};

module.exports = { runDailyReminders };
