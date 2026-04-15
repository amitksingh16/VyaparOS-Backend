const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firm.controller');
const { protect } = require('../middleware/authMiddleware');

// Base Route: /api/firm

// Create a new firm
router.post('/create', protect, firmController.createFirm);

// Get logged-in user's firm details
router.get('/me', protect, firmController.getMyFirm);

module.exports = router;
