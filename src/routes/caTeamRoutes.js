const express = require('express');
const router = express.Router();
const caTeamController = require('../controllers/caTeamController');
const { protect } = require('../middleware/authMiddleware');

// Check that the user is actually a CA owner, not just standard staff, if we need that granularity.
// 'protect' validates the JWT and adds req.user.

router.get('/', protect, caTeamController.getStaffMembers);
router.post('/', protect, caTeamController.inviteStaffMember);
router.post('/invite', protect, caTeamController.inviteStaffMember);
router.delete('/:id', protect, caTeamController.removeStaffMember);
router.put('/:id/assignments', protect, caTeamController.updateStaffAssignments);

module.exports = router;
