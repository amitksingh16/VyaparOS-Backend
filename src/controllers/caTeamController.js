const { User, StaffClientAssignment, Business, CAClient, Invitation } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwtService');
const nodemailer = require('nodemailer');

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
        const { name, email, mobile, phone, role, assigned_client_ids } = req.body;
        let caId = req.user.id;
        let parentUser;
        if (caId) {
            parentUser = await User.findByPk(caId);
        } else if (req.user.email) {
            parentUser = await User.findOne({ where: { email: req.user.email } });
        }

        if (!parentUser) {
            console.log('[TEAM INVITE] CA User not found. ID:', caId, 'Email:', req.user.email);
            return res.status(404).json({ success: false, message: 'CA User not found' });
        }
        
        caId = parentUser.id; // Corrected to internal DB id
        
        console.log(`[TEAM INVITE] Invoker ID: ${caId}, Role: ${parentUser.role}, Setup: ${parentUser.setup_completed}, Firm Setup: ${parentUser.is_firm_setup_complete}`);

        // Check if firm setup is complete.
        // It allows 'owner' or 'ca' roles.
        if (!parentUser.setup_completed && !parentUser.is_firm_setup_complete && !parentUser.firm_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Firm profile incomplete. Please complete Firm Setup first.' 
            });
        }

        // Ensure phone is explicitly prioritized based on new frontend changes
        const contactMobile = phone || mobile;

        if (!name || !email || !contactMobile || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, phone/mobile, and role are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

        const existingPhoneUser = await User.findOne({ where: { phone: contactMobile } });
        if (existingPhoneUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this mobile already exists' 
            });
        }

        const crypto = require('crypto');
        const invite_token = crypto.randomBytes(32).toString('hex');

        const invite_expiry = new Date();
        invite_expiry.setHours(invite_expiry.getHours() + 24); // 24 hours validity

        const newUser = await User.create({
            name,
            email,
            phone: contactMobile,
            role,
            parent_ca_id: caId,
            invite_status: 'invited',
            password: null,
            invite_token,
            invite_expiry
        });

        const caFirmName = req.user.name || 'Your CA Firm';
        const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${invite_token}`;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        try {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: `Invitation to join ${caFirmName} on VyaparOS`,
                html: `
                    <h2>Hello ${name},</h2>
                    <p>You have been invited to join <strong>${caFirmName}</strong> as a ${role === 'ca_staff' ? 'Staff Member' : 'Article Assistant'}.</p>
                    <p>Please click the link below to set your password and access your dashboard. This link will expire in 24 hours.</p>
                    <a href="${inviteUrl}">Set Up Account</a>
                `
            });
        } catch (emailError) {
            console.error('Email delivery failure:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Email delivery failure'
            });
        }

        if (assigned_client_ids && Array.isArray(assigned_client_ids) && assigned_client_ids.length > 0) {
            const newAssignments = assigned_client_ids.map(bId => ({
                staff_id: newUser.id,
                business_id: bId
            }));
            await StaffClientAssignment.bulkCreate(newAssignments);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Invitation created successfully' 
        });
    } catch (err) {
        console.error('Error inviting staff:', err.message);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
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
