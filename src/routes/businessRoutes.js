const express = require('express');
const router = express.Router();
const {
    createBusiness,
    getBusinesses,
    getActivityLogs,
    updateSettings
} = require('../controllers/businessController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All routes are protected

router.post('/', createBusiness);
router.get('/', getBusinesses);
router.get('/:id/activities', getActivityLogs);
router.put('/:id/settings', updateSettings);

module.exports = router;
