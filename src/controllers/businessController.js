const { Business, User, ActivityLog } = require('../models');
const { generateInitialCompliances } = require('./complianceController');

// @desc    Register a new business
// @route   POST /api/businesses
// @access  Private
const createBusiness = async (req, res) => {
    try {
        const {
            business_name,
            pan,
            gstin,
            business_type,
            state,
            turnover,
            filing_type,
        } = req.body;

        // TODO: Verify PAN/GSTIN via external API here

        
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (pan && !panRegex.test(pan)) {
            return res.status(400).json({ message: 'Invalid PAN format.' });
        }
        if (gstin && !gstinRegex.test(gstin)) {
            return res.status(400).json({ message: 'Invalid GSTIN format.' });
        }

        const business = await Business.create({
            owner_id: req.user.id,
            business_name,
            pan,
            gstin,
            business_type,
            state,
            turnover,
            filing_type,
        });

        // Mark user setup as completed
        const user = await User.findByPk(req.user.id);
        if (user && !user.setup_completed) {
            user.setup_completed = true;
            await user.save();
        }

        // Auto-generate upcoming compliance deadlines asynchronously
        generateInitialCompliances(business).catch(err => {
            console.error('Failed to auto-generate compliances:', err);
        });

        res.status(201).json(business);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all businesses for current user
// @route   GET /api/businesses
// @access  Private
const getBusinesses = async (req, res) => {
    try {
        const { ClientMeta } = require('../models');
        const businesses = await Business.findAll({
            where: { owner_id: req.user.id },
            include: [{ model: ClientMeta, as: 'client_meta' }]
        });
        
        const formatted = businesses.map(b => {
            const data = b.toJSON();
            if (data.client_meta) {
                data.whatsapp_alerts = data.client_meta.whatsapp_alerts;
                data.email_digest = data.client_meta.email_digest;
            } else {
                data.whatsapp_alerts = true;
                data.email_digest = true;
            }
            return data;
        });

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get activity logs for a business
// @route   GET /api/businesses/:id/activities
// @access  Private
const getActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify the business belongs to the user
        const business = await Business.findOne({
            where: { id, owner_id: req.user.id }
        });

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const logs = await ActivityLog.findAll({
            where: { client_id: id },
            order: [['createdAt', 'DESC']],
            limit: 5,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json(logs);
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { whatsapp_alerts, email_digest } = req.body;

        const business = await Business.findByPk(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const { ClientMeta } = require('../models');
        
        let meta = await ClientMeta.findOne({ where: { business_id: id } });
        if (!meta) {
            meta = await ClientMeta.create({
                business_id: id,
                whatsapp_alerts: whatsapp_alerts !== undefined ? whatsapp_alerts : true,
                email_digest: email_digest !== undefined ? email_digest : true
            });
        } else {
            if (whatsapp_alerts !== undefined) meta.whatsapp_alerts = whatsapp_alerts;
            if (email_digest !== undefined) meta.email_digest = email_digest;
            await meta.save();
        }

        res.json({ message: 'Settings updated successfully', settings: { whatsapp_alerts: meta.whatsapp_alerts, email_digest: meta.email_digest } });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createBusiness,
    getBusinesses,
    getActivityLogs,
    updateSettings
};
