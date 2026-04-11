const { User, StaffClientAssignment, Business, CAClient, Invitation } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwtService');

const getStaffMembers = async (req, res) => {
    try {
        const caId = req.user.id;

        const staff = await User.findAll({
            where: { parent_ca_id: caId },
            include: [{
                model: Business,
                as: 'assigned_clients',
                attributes: ['id']
            }],
            attributes: ['id', 'name', 'email', 'phone', 'role', 'invite_status', 'createdAt']
        });

        // Also fetch pending invitations for this CA
        const invitations = await Invitation.findAll({
            where: {
                ca_id: caId,
                status: 'pending'
            }
        });

        // Format to easily consumptible shape for frontend
        const formattedStaff = staff.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role,
            status: member.invite_status === 'invited' ? 'Pending' : (member.invite_status || 'active'),
            client_count: member.assigned_clients ? member.assigned_clients.length : 0,
            assigned_client_ids: member.assigned_clients ? member.assigned_clients.map(c => c.id) : [],
            joined: member.createdAt,
            isInvitation: false
        }));

        const formattedInvites = invitations.map(invite => ({
            id: `inv_${invite.id}`,
            token: invite.token,
            name: invite.email.split('@')[0], // placeholder name until they accept
            email: invite.email,
            phone: invite.phone,
            role: invite.role,
            status: 'Pending',
            client_count: invite.assigned_clients_json ? JSON.parse(invite.assigned_clients_json).length : 0,
            assigned_client_ids: invite.assigned_clients_json ? JSON.parse(invite.assigned_clients_json) : [],
            joined: invite.createdAt,
            isInvitation: true
        }));

        res.json([...formattedStaff, ...formattedInvites]);
    } catch (err) {
        console.error('Error fetching staff members:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const inviteStaffMember = async (req, res) => {
    try {
        const caId = req.user.id;
        const { name, email, phone, role, assigned_client_ids, origin } = req.body;

        if (!name || !email || !phone || !role) {
            return res.status(400).json({ message: 'Name, email, phone, and role are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const caFirmName = req.user.name || 'Your CA Firm';
        
        const expires_at = new Date();
        expires_at.setHours(expires_at.getHours() + 48); // 48 hours validity

        const newInvitation = await Invitation.create({
            email,
            phone,
            role,
            assigned_clients_json: JSON.stringify(assigned_client_ids || []),
            status: 'pending',
            expires_at,
            ca_id: caId,
            firm_name: caFirmName
        });

        // Simulating sending a professional email
        const baseOrigin = origin || `${req.protocol}://${req.get('host')}`;
        const setupLink = `${baseOrigin}/invite/${newInvitation.token}`;

        console.log(`
=========================================================
[MOCK EMAIL SENT TO: ${email}]
Subject: Invitation to join ${caFirmName} on VyaparOS

Hello ${name},

You have been invited to join ${caFirmName} as a ${role === 'ca_staff' ? 'Staff Member' : 'Article Assistant'}.
VyaparOS is our central compliance and practice management platform.

Please click the link below to set your password and access your dashboard.
Your dashboard will be restricted to only the clients assigned to you.
This link will expire in 48 hours.

Set Up Account: ${setupLink}

Welcome to the team!
=========================================================
`);

        res.status(201).json({ message: 'Staff member invited successfully', invitation: newInvitation });
    } catch (err) {
        console.error('Error inviting staff:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeStaffMember = async (req, res) => {
    try {
        const caId = req.user.id;
        // Check if it's an invitation being removed
        if (req.params.id.startsWith('inv_')) {
            const inviteId = req.params.id.replace('inv_', '');
            const invite = await Invitation.findOne({ where: { id: inviteId, ca_id: caId } });
            if (!invite) return res.status(404).json({ message: 'Invitation not found' });
            await invite.destroy();
            return res.json({ message: 'Invitation removed successfully' });
        }

        const staffId = req.params.id;
        const { reassign_to } = req.body; // target user ID to reassign clients to

        const staffMember = await User.findOne({ where: { id: staffId, parent_ca_id: caId } });
        if (!staffMember) {
            return res.status(404).json({ message: 'Staff member not found or unauthorized' });
        }

        // Reassign clients if needed
        if (reassign_to) {
            // First find clients currently assigned to this staff member
            const currentAssignments = await StaffClientAssignment.findAll({
                where: { staff_id: staffId }
            });

            if (currentAssignments.length > 0) {
                if (reassign_to === caId) {
                    // Reassigning to the parent CA just means removing the specific staff_id assignment 
                    // because the CA already has access via CAClient. We just delete these.
                    await StaffClientAssignment.destroy({ where: { staff_id: staffId } });
                } else {
                    // Reassign to another staff member
                    const newAssignments = currentAssignments.map(a => ({
                        staff_id: reassign_to,
                        business_id: a.business_id
                    }));
                    // Delete old, then bulk insert new
                    await StaffClientAssignment.destroy({ where: { staff_id: staffId } });
                    // Use ignoreDuplicates in case they are already assigned
                    await StaffClientAssignment.bulkCreate(newAssignments, { ignoreDuplicates: true });
                }
            }
        } else {
            // No reassignment, just orphan the connection (clients default to CAOwner)
            await StaffClientAssignment.destroy({ where: { staff_id: staffId } });
        }

        // Physically delete the user
        await staffMember.destroy();

        res.json({ message: 'Staff member removed successfully' });
    } catch (err) {
        console.error('Error removing staff:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateStaffAssignments = async (req, res) => {
    try {
        const caId = req.user.id;
        // Check if it's an invitation being updated
        if (req.params.id.startsWith('inv_')) {
            const inviteId = req.params.id.replace('inv_', '');
            const invite = await Invitation.findOne({ where: { id: inviteId, ca_id: caId } });
            if (!invite) return res.status(404).json({ message: 'Invitation not found' });
            
            invite.assigned_clients_json = JSON.stringify(assigned_client_ids);
            await invite.save();
            return res.json({ message: 'Invitation assignments updated successfully', client_count: assigned_client_ids.length });
        }

        const staffId = req.params.id;
        const { assigned_client_ids: staff_client_ids } = req.body; // array of business IDs

        // Verify staff belongs to this CA
        const staffMember = await User.findOne({ where: { id: staffId, parent_ca_id: caId } });
        if (!staffMember) {
            return res.status(404).json({ message: 'Staff member not found or unauthorized' });
        }

        if (!Array.isArray(staff_client_ids)) {
            return res.status(400).json({ message: 'Invalid assigned_client_ids format' });
        }

        // Verify CA has access to these businesses (if any are provided)
        let verifiedClientIds = [];
        if (staff_client_ids.length > 0) {
            const caClients = await CAClient.findAll({
                where: {
                    ca_id: caId,
                    business_id: { [Op.in]: staff_client_ids },
                    status: 'active'
                }
            });
            verifiedClientIds = caClients.map(c => c.business_id);
        }

        // 1. Remove all existing assignments for THIS staff member
        await StaffClientAssignment.destroy({ where: { staff_id: staffId } });

        // 2. Remove existing global assignments for the NEWLY selected clients to ensure 1:1 mapping
        if (verifiedClientIds.length > 0) {
            await StaffClientAssignment.destroy({ where: { business_id: { [Op.in]: verifiedClientIds } } });

            // 3. Insert new assignments
            const newAssignments = verifiedClientIds.map(bId => ({
                staff_id: staffId,
                business_id: bId
            }));
            await StaffClientAssignment.bulkCreate(newAssignments);
        }

        res.json({ message: 'Staff assignments updated successfully', client_count: verifiedClientIds.length });
    } catch (err) {
        console.error('Error updating staff assignments:', err);
        res.status(500).json({ message: 'Server error updating staff assignments' });
    }
};

module.exports = {
    getStaffMembers,
    inviteStaffMember,
    removeStaffMember,
    updateStaffAssignments
};
