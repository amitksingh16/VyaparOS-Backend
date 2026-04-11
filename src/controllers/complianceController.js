const { ComplianceItem, Business, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// Service function to auto-generate compliances for a new business
const generateInitialCompliances = async (business) => {
    if (!business || !business.id) return;

    // Only generate GST compliances if they are registered (assuming this is how the app works,
    // though the prompt implies we just run it if registered. Since the Business model
    // relies on gstin existence to imply registration, we'll check that)
    if (!business.gstin && business.gst_registered === false) return; // If model has it

    const items = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    // Constants for QRMP state deadline calculation
    const STATE_22ND = [
        "Chhattisgarh", "Madhya Pradesh", "Gujarat", "Maharashtra", "Karnataka", "Goa", "Kerala", "Tamil Nadu", "Telangana", "Andhra Pradesh", "Daman and Diu and Dadra and Nagar Haveli", "Puducherry", "Andaman and Nicobar Islands", "Lakshadweep"
    ];

    // Generate for next 3 months + static quarterly/yearly tasks
    for (let i = 0; i < 3; i++) {
        const targetDate = new Date(currentYear, currentMonth + i + 1, 1);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        if (business.filing_type === 'monthly') {
            // GSTR-1: 11th of next month
            items.push({
                business_id: business.id,
                compliance_type: 'gstr1',
                frequency: 'monthly',
                due_date: new Date(targetYear, targetMonth, 11),
                status: 'upcoming',
                notes: `GSTR-1 for ${targetMonth === 0 ? 12 : targetMonth}/${targetMonth === 0 ? targetYear - 1 : targetYear}`
            });

            // GSTR-3B: 20th of next month
            items.push({
                business_id: business.id,
                compliance_type: 'gstr3b',
                frequency: 'monthly',
                due_date: new Date(targetYear, targetMonth, 20),
                status: 'upcoming',
                notes: `GSTR-3B for ${targetMonth === 0 ? 12 : targetMonth}/${targetMonth === 0 ? targetYear - 1 : targetYear}`
            });
        } else if (business.filing_type === 'qrmp') {
            // QRMP ends Mar (2), Jun (5), Sep (8), Dec (11) -> Filings in Apr (3), Jul (6), Oct (9), Jan (0)
            if ([0, 3, 6, 9].includes(targetMonth)) {
                // GSTR-1 (Quarterly): 13th
                items.push({
                    business_id: business.id,
                    compliance_type: 'gstr1',
                    frequency: 'quarterly',
                    due_date: new Date(targetYear, targetMonth, 13),
                    status: 'upcoming',
                    notes: `GSTR-1 (Quarterly) for Quarter ending ${targetMonth === 0 ? 12 : targetMonth}/${targetMonth === 0 ? targetYear - 1 : targetYear}`
                });

                // GSTR-3B (Quarterly): 22nd or 24th
                const is22ndState = business.state && STATE_22ND.includes(business.state);
                const gstr3bDate = is22ndState ? 22 : 24;

                items.push({
                    business_id: business.id,
                    compliance_type: 'gstr3b',
                    frequency: 'quarterly',
                    due_date: new Date(targetYear, targetMonth, gstr3bDate),
                    status: 'upcoming',
                    notes: `GSTR-3B (Quarterly) for Quarter ending ${targetMonth === 0 ? 12 : targetMonth}/${targetMonth === 0 ? targetYear - 1 : targetYear}`
                });
            }
        }

        // TDS Filing: 31st Jan, May, Jul, Oct. (Targeting months: 0, 4, 6, 9)
        if ([0, 4, 6, 9].includes(targetMonth)) {
            items.push({
                business_id: business.id,
                compliance_type: 'tds',
                frequency: 'quarterly',
                due_date: new Date(targetYear, targetMonth, 31),
                status: 'upcoming',
                notes: `TDS Return for Quarter ending ${targetMonth === 0 ? 12 : targetMonth}/${targetMonth === 0 ? targetYear - 1 : targetYear}`
            });
        }
    }

    // GST Audit (9C): 31st Dec for turnover > ₹5 Crores
    if (business.turnover && parseFloat(business.turnover) > 50000000) {
        // Evaluate if December task has been added yet for currentYear
        items.push({
            business_id: business.id,
            compliance_type: 'audit9c',
            frequency: 'annually',
            due_date: new Date(currentYear, 11, 31), // Dec 31
            status: 'upcoming',
            notes: `GST Audit (9C) for Financial Year ${currentYear - 1}-${currentYear.toString().slice(-2)}`
        });
    }

    // Bulk create
    try {
        await ComplianceItem.bulkCreate(items);
        console.log(`Generated ${items.length} compliance items for business ${business.id}`);

        // Create Activity Log
        await ActivityLog.create({
            client_id: business.id,
            performed_by: business.owner_id || null,
            event_type: 'CLIENT_CREATED',
            description: 'Client onboarded and initial compliances generated.',
        });
    } catch (err) {
        console.error("Error generating compliances:", err);
    }
};

// Service function to automatically mark past-due upcoming compliances as overdue
const processOverdueCompliances = async (businessId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const itemsToUpdate = await ComplianceItem.findAll({
            where: {
                business_id: businessId,
                status: {
                    [Op.notIn]: ['filed', 'overdue', 'waived']
                },
                due_date: {
                    [Op.lt]: today
                }
            }
        });

        if (itemsToUpdate.length > 0) {
            for (const item of itemsToUpdate) {
                item.status = 'overdue';
                await item.save();

                // Removed overdue activity log creation to strictly conform to requested event_type enums.
            }
            console.log(`Updated ${itemsToUpdate.length} compliances to overdue for business ${businessId}`);
        }
    } catch (err) {
        console.error("Error processing overdue compliances:", err);
    }
};

const getCalendar = async (req, res) => {
    try {
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ message: 'Business ID required' });
        }

        // Process overdue items before fetching to ensure data is up to date
        await processOverdueCompliances(business_id);

        const items = await ComplianceItem.findAll({
            where: { business_id },
            order: [['due_date', 'ASC']]
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const generateCalendar = async (req, res) => {
    // ... handling remains ...
    try {
        const { business_id } = req.body;
        if (!business_id) {
            return res.status(400).json({ message: 'Business ID required' });
        }

        const business = await Business.findByPk(business_id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        await generateInitialCompliances(business);
        res.json({ message: 'Compliances generated successfully' });
    } catch (error) {
        console.error('Error generating calendar:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const markAsFiled = async (req, res) => {
    try {
        const { id } = req.params;

        const compliance = await ComplianceItem.findByPk(id, {
            include: [{ model: Business, as: 'business' }]
        });

        if (!compliance) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        if (compliance.status === 'filed') {
            return res.status(400).json({ message: 'Compliance is already filed' });
        }

        // Update compliance item
        compliance.status = 'filed';
        compliance.filed_date = new Date();
        await compliance.save();

        const fType = compliance.compliance_type.toUpperCase() === 'GSTR3B' ? 'GSTR-3B' :
            compliance.compliance_type.toUpperCase() === 'GSTR1' ? 'GSTR-1' :
                compliance.compliance_type.toUpperCase();

        // Create Activity Log
        await ActivityLog.create({
            client_id: compliance.business_id,
            performed_by: req.user.id,
            event_type: 'COMPLIANCE_MARKED_FILED',
            event_reference: compliance.id,
            description: `${fType} marked as filed`,
            metadata: {
                compliance_type: compliance.compliance_type,
                frequency: compliance.frequency
            }
        });

        res.json({ message: 'Compliance marked as filed successfully', compliance });
    } catch (error) {
        console.error('Error marking compliance as filed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const markAsPending = async (req, res) => {
    try {
        const { id } = req.params;

        const compliance = await ComplianceItem.findByPk(id, {
            include: [{ model: Business, as: 'business' }]
        });

        if (!compliance) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        if (compliance.status === 'pending') {
            return res.status(400).json({ message: 'Compliance is already pending' });
        }

        // Update compliance item
        compliance.status = 'pending';
        // If it was previously filed and is being reverted, clear the date
        if (compliance.filed_date) {
            compliance.filed_date = null;
        }
        await compliance.save();

        // Create Activity Log
        await ActivityLog.create({
            client_id: compliance.business_id,
            performed_by: req.user.id,
            event_type: 'COMPLIANCE_MARKED_PENDING',
            event_reference: compliance.id,
            description: `${compliance.compliance_type.toUpperCase()} marked as pending.`,
            metadata: {
                compliance_type: compliance.compliance_type,
                frequency: compliance.frequency
            }
        });

        res.json({ message: 'Compliance marked as pending successfully', compliance });
    } catch (error) {
        console.error('Error marking compliance as pending:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { generateInitialCompliances, processOverdueCompliances, getCalendar, generateCalendar, markAsFiled, markAsPending };
