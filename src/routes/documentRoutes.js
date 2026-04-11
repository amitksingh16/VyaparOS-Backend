const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadDocument, getClientDocuments, upload } = require('../controllers/documentController');

// Upload a document (uses multer middleware)
router.post('/upload', protect, upload.single('file'), uploadDocument);

// Unidentified docs routes
router.get('/unidentified', protect, require('../controllers/documentController').getUnidentifiedDocs);
router.put('/unidentified/:id/assign', protect, require('../controllers/documentController').assignUnidentifiedDoc);
router.post('/webhook/receive', require('../controllers/documentController').receiveWebhookDoc); // Public mockup endpoint for testing

// Get documents for a specific client
router.get('/:businessId', protect, getClientDocuments);

// Get pending whatsapp documents for a specific client
router.get('/:businessId/whatsapp', protect, require('../controllers/documentController').getPendingWhatsAppDocs);

// Download documents as ZIP for a specific month
router.get('/:businessId/zip', protect, require('../controllers/documentController').downloadMonthZip);

// Delete a document
router.delete('/:id', protect, require('../controllers/documentController').deleteDocument);

module.exports = router;
