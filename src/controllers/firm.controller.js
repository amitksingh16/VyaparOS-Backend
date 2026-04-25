const { Firm, User } = require('../models');

exports.createFirm = async (req, res) => {
    try {
        const { name, type, pan, gst, email, phone, address } = req.body;
        let existingUser;
        if (req.user.id) {
            existingUser = await User.findByPk(req.user.id);
        } else if (req.user.email) {
            existingUser = await User.findOne({ where: { email: req.user.email } });
        }

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }
        const ownerId = existingUser.id;

        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required to create a firm.'
            });
        }

        // Check if user already has a firm
        if (existingUser.firm_id) {
            return res.status(400).json({
                success: false,
                message: 'User is already associated with a firm.'
            });
        }

        // Create the firm
        const newFirm = await Firm.create({
            name,
            type,
            pan_number: pan,
            gstin: gst,
            email,
            mobile_number: phone,
            address,
            owner_id: ownerId
        });

        // Update the user
        await User.update({
            firm_id: newFirm.id,
            is_firm_setup_complete: true
        }, {
            where: { id: ownerId }
        });

        return res.status(201).json({
            success: true,
            message: 'Firm created successfully',
            data: newFirm
        });
    } catch (error) {
        console.error('Error creating firm:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while creating firm.',
            error: error.message
        });
    }
};

exports.getMyFirm = async (req, res) => {
    try {
        let user;
        if (req.user.id) {
            user = await User.findByPk(req.user.id, {
                include: [{ model: Firm, as: 'firm' }]
            });
        } else if (req.user.email) {
            user = await User.findOne({ 
                where: { email: req.user.email },
                include: [{ model: Firm, as: 'firm' }]
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (!user.firm) {
            return res.status(404).json({
                success: false,
                message: 'Firm not found for the user.'
            });
        }

        return res.status(200).json({
            success: true,
            data: user.firm
        });
    } catch (error) {
        console.error('Error fetching firm:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching firm.',
            error: error.message
        });
    }
};
