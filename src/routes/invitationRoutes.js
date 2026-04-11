const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');

// Public endpoints
router.get('/:token', invitationController.validateInvitation);
router.post('/:token/accept', invitationController.acceptInvitation);

module.exports = router;
