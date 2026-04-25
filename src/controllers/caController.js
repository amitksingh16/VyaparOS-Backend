const { CAClient, StaffClientAssignment, Business, ComplianceItem, User, ActivityLog, NotificationLog, Document, Firm } = require('../models');
const { Op } = require('sequelize');
const { generateInitialCompliances } = require('./complianceController');
const { runDailyReminders } = require('../utils/reminderEngine');
const { generateToken } = require('../utils/jwtService');

const getCADashboard = async (req, res) => {
    try {
        const caUserId = req.user.id;
        const userRole = req.user.role; // ca, ca_staff, ca_article

        let businessIds = [];

        if (userRole === 'ca') {
            // Owner CA: Sees all clients
            const caClients = await CAClient.findAll({
                where: { ca_id: caUserId, status: 'active' }
            });
            businessIds = caClients.map(client => client.business_id);
        } else if (userRole === 'ca_staff' || userRole === 'ca_article') {
            // Staff / Article: Only sees assigned clients
            const assignedClients = await StaffClientAssignment.findAll({
                where: { staff_id: caUserId }
            });
            businessIds = assignedClients.map(client => client.business_id);
        } else {
            return res.status(403).json({ message: 'Unauthorized role for CA Dashboard' });
        }

        if (businessIds.length === 0) {
            return res.json({
                stats: { total: 0, healthy: 0, attention: 0, critical: 0 },
                clients: []
            });
        }

        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);

        const businesses = await Business.findAll({
            where: { id: { [Op.in]: businessIds } },
            include: [
                {
                    model: ComplianceItem,
                    as: 'compliance_items',
                },
                {
                    model: User,
                    as: 'added_by_staff',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assigned_staff',
                    attributes: ['id', 'name']
                },
                {
                    model: Document,
                    as: 'documents',
                    where: { month: currentMonthStr },
                    required: false
                }
            ]
        });

        let total = businesses.length;
        let healthy = 0;
        let attention = 0;
        let critical = 0;

        // Workload Forecast tracking
        // Zero out time for strict day comparison
        now.setHours(0, 0, 0, 0);
        const next7Days = new Date(now);
        next7Days.setDate(now.getDate() + 7);

        let totalFilingsDue7Days = 0;
        const clientsWithFilings7Days = new Set();

        const clientsData = businesses.map(business => {
            const items = business.compliance_items || [];

            // Calculate health %
            const totalItems = items.length;
            const overdueItems = items.filter(item => item.status === 'overdue').length;
            const filedItems = items.filter(item => item.status === 'filed').length;
            const pendingItems = items.filter(item => item.status === 'upcoming' || item.status === 'pending').length;

            items.forEach(item => {
                if (item.status === 'upcoming' || item.status === 'pending') {
                    if (item.due_date) {
                        const dueDate = new Date(item.due_date);
                        dueDate.setHours(0, 0, 0, 0);

                        // If due within next 7 days (or exactly 7 days from today)
                        if (dueDate >= now && dueDate <= next7Days) {
                            totalFilingsDue7Days++;
                            clientsWithFilings7Days.add(business.id);
                        }
                    }
                }
            });

            const documents = business.documents || [];
            let bankCount = 0;
            let salesCount = 0;
            let purchaseCount = 0;

            const currentMonthStr = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

            documents.forEach(doc => {
                // Only consider documents for the current month
                if (doc.month === currentMonthStr) {
                    if (doc.category === 'Bank Statements') bankCount++;
                    if (doc.category === 'GST Sales') salesCount++;
                    if (doc.category === 'GST Purchase') purchaseCount++;
                }
            });

            let categoriesPresent = 0;
            if (bankCount > 0) categoriesPresent++;
            if (salesCount > 0) categoriesPresent++;
            if (purchaseCount > 0) categoriesPresent++;

            let health = Math.round((categoriesPresent / 3) * 100);

            // Client Status categorization based on health
            // Healthy: >= 80%, Attention: 50% - 79%, Critical: < 50%
            if (health >= 80) healthy++;
            else if (health >= 50) attention++;
            else critical++;

            // Mock Last Activity date for now
            const lastActivity = items.length > 0
                ? items.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt
                : business.updatedAt;

            const assignedStaffList = business.assigned_staff || [];
            const assignedStaffName = assignedStaffList.length > 0 ? assignedStaffList[0].name : null;
            const assignedStaffId = assignedStaffList.length > 0 ? assignedStaffList[0].id : null;

            return {
                id: business.id,
                business_name: business.business_name,
                email: business.email,
                primary_mobile: business.primary_mobile,
                whatsapp_mobile: business.whatsapp_mobile,
                filing_type: business.filing_type,
                compliance_health: health,
                pending_count: pendingItems,
                overdue_count: overdueItems,
                last_activity: lastActivity,
                added_by_staff_name: business.added_by_staff ? business.added_by_staff.name : null,
                assigned_to_name: assignedStaffName,
                assigned_to_id: assignedStaffId
            };
        });

        res.json({
            stats: {
                total,
                healthy,
                attention,
                critical,
                total_filings_due: totalFilingsDue7Days,
                unique_clients: clientsWithFilings7Days.size
            },
            clients: clientsData
        });

    } catch (error) {
        console.error('Error fetching CA dashboard:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addClient = async (req, res) => {
    try {
        let caUserId = req.user.id;
        const userRole = req.user.role; // can be 'ca', 'ca_staff', 'ca_article'
        let added_by_staff_id = null;

        // If a staff is adding a client, the CA owner is their parent_ca_id
        if (userRole === 'ca_staff' || userRole === 'ca_article') {
            const staffUser = await User.findByPk(req.user.id);
            if (!staffUser || !staffUser.parent_ca_id) {
                return res.status(403).json({ message: 'Staff member is not associated with a CA firm.' });
            }
            caUserId = staffUser.parent_ca_id; // Assign to the firm overarching ID
            added_by_staff_id = req.user.id;   // Keep track of the actual creator
        }

        const {
            business_name,
            email,
            primary_mobile,
            whatsapp_mobile,
            primary_phone,
            secondary_phone,
            pan_number,
            gst_number,
            business_type,
            entity_type,
            gst_registered,
            gstin,
            filing_type,
            state,
            assigned_to
        } = req.body;

        if (!business_name) {
            return res.status(400).json({ message: 'Business name is required' });
        }
        
        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        if (gst_registered && !gstin) {
            return res.status(400).json({ message: 'GSTIN is required if GST registered' });
        }

        
        const mobileRegex = /^[0-9]{10}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (primary_mobile && !mobileRegex.test(primary_mobile)) {
            return res.status(400).json({ message: 'Invalid mobile format. Must be 10 digits.' });
        }
        if (pan_number && !panRegex.test(pan_number)) {
            return res.status(400).json({ message: 'Invalid PAN format.' });
        }
        const effectiveGst = gst_registered ? (gstin || gst_number) : (gst_number || gstin || null);
        if (effectiveGst && !gstinRegex.test(effectiveGst)) {
            return res.status(400).json({ message: 'Invalid GSTIN format.' });
        }

        // 1. Create the new Business
        const newBusiness = await Business.create({
            business_name,
            email,
            primary_mobile: primary_mobile || null,
            primary_phone: primary_phone || null,
            whatsapp_mobile: whatsapp_mobile || null,
            secondary_phone: secondary_phone || null,
            pan_number: pan_number || null,
            gst_number: gst_number || null,
            business_type: business_type || entity_type || 'prop',
            gstin: gst_registered ? (gstin || gst_number) : null,
            filing_type: filing_type || 'monthly',
            state: state || null,
            added_by_staff_id: added_by_staff_id
        });

        // 2. Link the Business to the main logged-in CA or the parent CA
        await CAClient.create({
            ca_id: caUserId,
            business_id: newBusiness.id,
            status: 'active'
        });

        // 2.5 If assigned explicitly, use that; else if staff added it, auto-assign the client to them
        if (assigned_to) {
            await StaffClientAssignment.create({
                staff_id: assigned_to,
                business_id: newBusiness.id
            });
        } else if (added_by_staff_id) {
            await StaffClientAssignment.create({
                staff_id: added_by_staff_id,
                business_id: newBusiness.id
            });
        }

        // 3. Generate Initial Compliances for the new business
        await generateInitialCompliances(newBusiness);

        // 4. Create Activity Log
        await ActivityLog.create({
            client_id: newBusiness.id,
            performed_by: req.user.id, // the physical person who added it
            event_type: 'CLIENT_CREATED',
            description: 'Client onboarded successfully.',
        });

        res.status(201).json({
            message: 'Client added successfully',
            business: newBusiness
        });

    } catch (error) {
        console.error('Error adding new client:', error);
        res.status(500).json({ message: 'Server error while adding client' });
    }
};

const completeSetup = async (req, res) => {
    try {
        const {
            firm_name,
            estimated_clients,
            portfolio_composition,
            teamMembers,
            business_name,
            email,
            primary_mobile,
            whatsapp_mobile,
            primary_phone,
            secondary_phone,
            pan_number,
            gst_number,
            business_type,
            entity_type,
            gst_registered,
            gstin,
            filing_type,
            state
        } = req.body;

        if (!firm_name) {
            return res.status(400).json({ message: 'Firm name is required' });
        }

        let caUserId = req.user.id;
        
        let caUser;
        if (caUserId) {
            caUser = await User.findByPk(caUserId);
        } else if (req.user.email) {
            caUser = await User.findOne({ where: { email: req.user.email } });
        }

        if (!caUser) {
            console.log('[SETUP] CA User not found. ID:', caUserId, 'Email:', req.user.email);
            return res.status(404).json({ message: 'CA User not found' });
        }
        
        caUserId = caUser.id; // ensure caUserId is correctly set to DB ID

        // Create or Update Firm Record
        let firm = await Firm.findOne({ where: { owner_id: caUserId } });
        if (firm) {
            firm.name = firm_name;
            firm.estimated_clients = estimated_clients || null;
            // Handle portfolio_composition as array or object properly mapped to JSON
            firm.portfolio_composition = portfolio_composition || null;
            await firm.save();
        } else {
            firm = await Firm.create({
                name: firm_name,
                email: caUser.email, // fallback email
                phone: caUser.phone, // fallback phone
                owner_id: caUserId,
                estimated_clients: estimated_clients || null,
                portfolio_composition: portfolio_composition || null
            });
        }

        // Update User
        caUser.name = firm_name;
        caUser.firm_id = firm.id;
        caUser.setup_completed = true;
        caUser.is_firm_setup_complete = true;
        await caUser.save();

        // 2. Process Initial Client if provided
        if (business_name && email) {

            const mobileRegex = /^[0-9]{10}$/;
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            
            if (primary_mobile && !mobileRegex.test(primary_mobile)) {
                return res.status(400).json({ message: 'Invalid mobile format. Must be 10 digits.' });
            }
            if (pan_number && !panRegex.test(pan_number)) {
                return res.status(400).json({ message: 'Invalid PAN format.' });
            }
            const effectiveGst = gst_registered ? (gstin || gst_number) : (gst_number || gstin || null);
            if (effectiveGst && !gstinRegex.test(effectiveGst)) {
                return res.status(400).json({ message: 'Invalid GSTIN format.' });
            }

            const newBusiness = await Business.create({
                business_name,
                email,
                primary_mobile: primary_mobile || null,
                primary_phone: primary_phone || null,
                whatsapp_mobile: whatsapp_mobile || null,
                secondary_phone: secondary_phone || null,
                pan_number: pan_number || null,
                gst_number: gst_number || null,
                business_type: business_type || entity_type || 'prop',
                gstin: gst_registered ? (gstin || gst_number) : null,
                filing_type: filing_type || 'monthly',
                state: state || null,
            });

            await CAClient.create({
                ca_id: caUserId,
                business_id: newBusiness.id,
                status: 'active'
            });

            await generateInitialCompliances(newBusiness);

            await ActivityLog.create({
                client_id: newBusiness.id,
                performed_by: caUserId,
                event_type: 'CLIENT_CREATED',
                description: 'Client onboarded successfully during firm setup.',
            });
        }

        // 3. Process Team Invitations
        const createdStaff = [];
        if (teamMembers && Array.isArray(teamMembers)) {
            for (const member of teamMembers) {
                if (!member.name || !member.email) continue;

                // Skip if email already exists
                const existingUser = await User.findOne({ where: { email: member.email } });
                if (existingUser) continue;

                const role = member.canOnboardClients ? 'ca_staff' : 'ca_article';

                const newStaff = await User.create({
                    name: member.name,
                    email: member.email,
                    role: role,
                    parent_ca_id: caUserId,
                    invite_status: 'invited',
                    is_verified: false,
                    setup_completed: false
                });

                const invite_token = generateToken(newStaff.id, newStaff.role);
                newStaff.invite_token = invite_token;
                await newStaff.save();

                createdStaff.push({
                    id: newStaff.id,
                    name: newStaff.name,
                    email: newStaff.email
                });

                // Simulate email sending
                const setupLink = `http://localhost:5173/staff-setup?token=${invite_token}`;
                console.log(`
=========================================================
[MOCK EMAIL SENT TO: ${member.email}]
Subject: Invitation to join ${firm_name} on VyaparOS

Hello ${member.name},

You have been invited to join ${firm_name} as a ${role === 'ca_staff' ? 'Staff Member' : 'Article Assistant'}.
VyaparOS is our central compliance and practice management platform.

Please click the link below to set your password and access your dashboard.
Your dashboard will be restricted to only the clients assigned to you.

Set Up Account: ${setupLink}

Welcome to the team!
=========================================================
`);
            }
        }

        res.status(200).json({
            message: 'CA setup completed successfully',
            firm_name,
            client_added: !!business_name,
            invited_members: createdStaff.length,
            user: {
                id: caUser.id,
                name: caUser.name,
                email: caUser.email,
                role: caUser.role,
                setup_completed: caUser.setup_completed,
                is_firm_setup_complete: caUser.is_firm_setup_complete,
                firm_id: caUser.firm_id
            },
            firm: firm
        });

    } catch (error) {
        console.error('Error completing CA setup:', error);
        res.status(500).json({ message: 'Server error while completing CA setup' });
    }
};

const getClientDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // If user is CA, verify they own the client
        if (req.user.role === 'ca') {
            const caClient = await CAClient.findOne({
                where: { ca_id: req.user.id, business_id: id, status: 'active' }
            });

            if (!caClient) {
                return res.status(403).json({ message: 'Not authorized to view this client' });
            }
        } 
        // If user is staff/article, verify they are explicitly assigned to this client
        else if (['ca_staff', 'ca_article'].includes(req.user.role)) {
            const assignment = await StaffClientAssignment.findOne({
                where: { staff_id: req.user.id, business_id: id }
            });

            if (!assignment) {
                return res.status(403).json({ message: 'Not assigned to this client' });
            }
        } else {
            return res.status(403).json({ message: 'Invalid role for CA dashboard access' });
        }

        const business = await Business.findByPk(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        res.json(business);
    } catch (error) {
        console.error('Error fetching client details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateClient = async (req, res) => {
    try {
        const caUserId = req.user.id;
        const { id } = req.params;
        const updates = req.body;

        // Verify CA has access to this business
        const caClient = await CAClient.findOne({
            where: { ca_id: caUserId, business_id: id, status: 'active' }
        });

        if (!caClient) {
            return res.status(403).json({ message: 'Not authorized to update this client' });
        }

        const business = await Business.findByPk(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Update fields safely
        const allowedUpdates = ['business_name', 'business_type', 'gstin', 'filing_type', 'state'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                business[field] = updates[field];
            }
        });

        await business.save();

        if (updates.assigned_to !== undefined) {
            // Remove existing assignments globally for this business (assuming 1-to-1)
            await StaffClientAssignment.destroy({ where: { business_id: id } });
            
            if (updates.assigned_to) {
                await StaffClientAssignment.create({
                    staff_id: updates.assigned_to,
                    business_id: id
                });
            }
        }

        // Create Activity Log
        await ActivityLog.create({
            client_id: business.id,
            performed_by: caUserId,
            event_type: 'CLIENT_UPDATED',
            description: 'Client details updated.',
            metadata: { updates }
        });

        res.json({ message: 'Client updated successfully', business });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Server error while updating client' });
    }
};

const getRecentActivities = async (req, res) => {
    try {
        const caUserId = req.user.id;

        // Fetch businesses assigned to this CA
        const caClients = await CAClient.findAll({
            where: { ca_id: caUserId, status: 'active' }
        });

        const businessIds = caClients.map(client => client.business_id);

        if (businessIds.length === 0) {
            return res.json([]);
        }

        const logs = await ActivityLog.findAll({
            where: { client_id: { [Op.in]: businessIds } },
            order: [['createdAt', 'DESC']],
            limit: 20,
            include: [
                {
                    model: Business,
                    as: 'business',
                    attributes: ['id', 'business_name']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json(logs);
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({ message: 'Server error while fetching activities' });
    }
};

const getEscalations = async (req, res) => {
    try {
        const caUserId = req.user.id;
        const caClients = await CAClient.findAll({ where: { ca_id: caUserId, status: 'active' } });
        const businessIds = caClients.map(c => c.business_id);

        if (businessIds.length === 0) return res.json([]);

        const logs = await NotificationLog.findAll({
            where: {
                business_id: { [Op.in]: businessIds },
                type: 'escalation'
            },
            include: [{
                model: Business,
                as: 'business',
                attributes: ['id', 'business_name']
            }],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json(logs);
    } catch (err) {
        console.error('Error fetching escalations:', err);
        res.status(500).json({ message: 'Server error while fetching escalations' });
    }
};

const triggerReminders = async (req, res) => {
    try {
        await runDailyReminders();
        res.json({ message: 'Daily reminders triggered manually' });
    } catch (error) {
        console.error('Error triggering reminders:', error);
        res.status(500).json({ message: 'Server error while triggering reminders' });
    }
};

const bulkAssignClients = async (req, res) => {
    try {
        const caUserId = req.user.id;
        const { clientIds, assign_to } = req.body; // array of business IDs, target staff ID

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({ message: 'Invalid or missing client IDs' });
        }

        // Verify CA has access to these businesses
        const caClients = await CAClient.findAll({
            where: {
                ca_id: caUserId,
                business_id: { [Op.in]: clientIds },
                status: 'active'
            }
        });

        const verifiedClientIds = caClients.map(c => c.business_id);
        if (verifiedClientIds.length === 0) {
            return res.status(400).json({ message: 'No authorized clients found to update' });
        }

        // Drop old assignments for these businesses globally to ensure 1:1 assignment behavior
        await StaffClientAssignment.destroy({ where: { business_id: { [Op.in]: verifiedClientIds } } });

        // If assign_to is provided, create new assignments mapping staff_id -> business_id
        if (assign_to) {
            // Further validation could ensure `assign_to` is a valid staff under this CA.
            const newAssignments = verifiedClientIds.map(bId => ({
                staff_id: assign_to,
                business_id: bId
            }));

            await StaffClientAssignment.bulkCreate(newAssignments);
        }

        res.json({ message: 'Clients bulk-assigned successfully', updatedCount: verifiedClientIds.length });
    } catch (err) {
        console.error('Error handling bulk assignment:', err);
        res.status(500).json({ message: 'Server error handling bulk assignment' });
    }
};

const setupCA = async (req, res) => {
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

        let caUserId = req.user?.id;
        let caUser;

        if (caUserId) {
            caUser = await User.findByPk(caUserId);
        } else if (req.user?.email) {
            caUser = await User.findOne({ where: { email: req.user.email } });
        }

        if (!caUser) {
            return res.status(404).json({ success: false, message: 'CA User not found' });
        }
        
        caUserId = caUser.id;

        let firm = await Firm.findOne({ where: { owner_id: caUserId } });
        if (firm) {
            firm.name = firm_name || firm.name;
            firm.estimated_clients = total_clients ?? firm.estimated_clients ?? null;
            firm.portfolio_composition = specialization ?? firm.portfolio_composition ?? null;
            firm.pan_number = pan_number ?? firm.pan_number ?? null;
            firm.gstin = gstin ?? firm.gstin ?? null;
            firm.mobile_number = mobile_number ?? firm.mobile_number ?? caUser.phone ?? null;
            await firm.save();
        } else {
            firm = await Firm.create({
                name: firm_name || 'My Firm',
                email: caUser.email,
                mobile_number: mobile_number || caUser.phone || null,
                owner_id: caUserId,
                estimated_clients: total_clients || null,
                portfolio_composition: specialization || null,
                pan_number: pan_number || null,
                gstin: gstin || null
            });
        }

        caUser.name = firm_name || caUser.name;
        caUser.firm_id = firm.id;
        await caUser.save();

        return res.status(200).json({ success: true, message: "Step 1 bypassed" });

    } catch (error) {
        console.error("DB Error:", error);
        return res.status(500).json({ success: false, error: error.message, location: "DB Update Failed" });
    }
};

module.exports = {
    getCADashboard,
    addClient,
    completeSetup,
    getClientDetails,
    updateClient,
    getRecentActivities,
    triggerReminders,
    getEscalations,
    bulkAssignClients,
    setupCA
};
