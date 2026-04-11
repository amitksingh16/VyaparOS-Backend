const { Invitation, User, StaffClientAssignment, CAClient } = require('../models');
const validateInvitation = async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await Invitation.findOne({ where: { token } });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({ message: 'Invitation is no longer valid' });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            invitation.status = 'expired';
            await invitation.save();
            return res.status(400).json({ message: 'Invitation has expired' });
        }

        res.json({
            email: invitation.email,
            phone: invitation.phone,
            firm_name: invitation.firm_name,
            role: invitation.role
        });
    } catch (err) {
        console.error('Error validating invitation:', err);
        res.status(500).json({ message: 'Server error validating invitation' });
    }
};

    const acceptInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const { name, email } = req.body;
        const idToken = req.headers.authorization?.split(" ")[1];

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (!idToken) {
            return res.status(400).json({ message: 'Firebase idToken is required for verification' });
        }

        const invitation = await Invitation.findOne({ where: { token } });

        if (!invitation || invitation.status !== 'pending') {
            return res.status(400).json({ message: 'Invalid or expired invitation' });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            invitation.status = 'expired';
            await invitation.save();
            return res.status(400).json({ message: 'Invitation has expired' });
        }

        if (idToken !== 'mock_token_123') {
            return res.status(401).json({ message: 'Authentication disabled during reset' });
        }

        const authEmail = email || invitation.email;
        const existingUser = await User.findOne({ where: { email: authEmail } });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        const newUser = await User.create({
            name,
            email: authEmail,
            phone: invitation.phone,
            role: invitation.role,
            parent_ca_id: invitation.ca_id,
            invite_status: 'active',
            is_verified: true, // Auto-verified since they accepted the invite
            setup_completed: true // Pre-setup
        });

        // 3. Process assignments
        let assigned_client_ids = [];
        if (invitation.assigned_clients_json) {
            try {
                assigned_client_ids = JSON.parse(invitation.assigned_clients_json);
            } catch (e) {
                console.error("Failed to parse assigned clients JSON", e);
            }
        }

        if (assigned_client_ids.length > 0) {
            // Verify the parent CA actually has these clients active (sanity check)
            const caClients = await CAClient.findAll({
                where: {
                    ca_id: invitation.ca_id,
                    business_id: assigned_client_ids,
                    status: 'active'
                }
            });
            const validBusinessIds = caClients.map(c => c.business_id);

            if (validBusinessIds.length > 0) {
                const assignments = validBusinessIds.map(bId => ({
                    staff_id: newUser.id,
                    business_id: bId
                }));
                await StaffClientAssignment.bulkCreate(assignments);
            }
        }

        // Update invitation status
        invitation.status = 'accepted';
        await invitation.save();

        res.status(201).json({
            message: 'Invitation accepted successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error('Error accepting invitation:', err);
        res.status(500).json({ message: 'Server error accepting invitation' });
    }
};

module.exports = {
    validateInvitation,
    acceptInvitation
};
