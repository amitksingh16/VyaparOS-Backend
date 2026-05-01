const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

// Authenticated send endpoint
router.post('/send', protect, invitationController.sendInvitation);

// Public endpoints
router.get('/:token', invitationController.validateInvitation);
router.post('/:token/accept', invitationController.acceptInvitation);

module.exports = router;
