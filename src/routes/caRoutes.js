const express = require('express');
const router = express.Router();
const { getCADashboard, addClient, completeSetup, getClientDetails, updateClient, getRecentActivities, triggerReminders, getEscalations, bulkAssignClients } = require('../controllers/caController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard summary and client list
router.get('/dashboard', protect, getCADashboard);

// Recent Activities across CA portfolio
router.get('/activities', protect, getRecentActivities);

// Handle CA onboarding completion
router.post('/setup', protect, completeSetup);

// Get Escalations (Module 3)
router.get('/escalations', protect, getEscalations);

// Add a new client under this CA
router.post('/clients', protect, addClient);

// Get specific client details
router.get('/clients/:id', protect, getClientDetails);

// Update specific client details
router.put('/clients/:id', protect, updateClient);

// Bulk assign clients
router.put('/clients/bulk-assign', protect, bulkAssignClients);

// Trigger manual reminder execution (Simulate Cron)
router.post('/reminders/run', protect, triggerReminders);

module.exports = router;
