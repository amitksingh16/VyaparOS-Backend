const { User, Firm } = require('../models');

const setupFirm = async (req, res) => {
    try {
        console.log("RECEIVED DATA:", req.body);
        const {
            firm_name,
            total_clients,
            specialization,
            pan_number,
            gstin,
            mobile_number
        } = req.body;

        const errors = [];

        if (!firm_name) {
            errors.push({ message: 'Firm name is required' });
        }
        if (!pan_number) {
            errors.push({ message: 'PAN number is required' });
        }

        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (mobile_number && !mobileRegex.test(mobile_number)) {
            errors.push({ message: 'Invalid mobile format. Must be 10 digits.' });
        }
        if (pan_number && !panRegex.test(pan_number)) {
            errors.push({ message: 'Invalid PAN format.' });
        }

        let finalGstin = null;
        if (gstin && String(gstin).trim() !== '') {
            finalGstin = String(gstin).trim().toUpperCase();
            if (!gstinRegex.test(finalGstin)) {
                errors.push({ message: 'Invalid GSTIN format.' });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: errors, message: "Missing or Invalid fields" });
        }

        let caUserId = req.user.id;
        
        let caUser;
        if (caUserId) {
            caUser = await User.findByPk(caUserId);
        } else if (req.user.email) {
            caUser = await User.findOne({ where: { email: req.user.email } });
        }

        if (!caUser) {
            return res.status(404).json({ success: false, message: 'CA User not found' });
        }
        
        caUserId = caUser.id;

        let firm = await Firm.findOne({ where: { owner_id: caUserId } });
        if (firm) {
            firm.name = firm_name;
            if (total_clients !== undefined) firm.estimated_clients = total_clients;
            if (specialization !== undefined) firm.portfolio_composition = specialization;
            firm.pan_number = pan_number;
            firm.gstin = finalGstin;
            if (mobile_number) {
                firm.mobile_number = mobile_number;
            } else if (caUser.phone) {
                firm.mobile_number = caUser.phone;
            }
            await firm.save();
        } else {
            firm = await Firm.create({
                name: firm_name,
                email: caUser.email,
                mobile_number: mobile_number || caUser.phone,
                owner_id: caUserId,
                estimated_clients: total_clients || null,
                portfolio_composition: specialization || null,
                pan_number: pan_number,
                gstin: finalGstin
            });
        }

        caUser.name = firm_name;
        caUser.firm_id = firm.id;
        await caUser.save();

        res.status(200).json({ success: true, message: "Firm setup successful" });
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ success: false, message: 'Database error', error: error.message });
    }
};

const completeOnboarding = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isOnboardingComplete = true;
        await user.save();

        console.log("Onboarding complete for user:", user.id);

        res.status(200).json({ success: true, message: 'Onboarding marked as complete' });
    } catch (error) {
        console.error('Error completing onboarding:', error);
        res.status(500).json({ message: 'Server error parsing completion' });
    }
};

module.exports = {
    setupFirm,
    completeOnboarding
};
