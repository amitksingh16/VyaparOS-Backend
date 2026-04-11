const express = require('express');
const router = express.Router();
const { Business } = require('../models');
const { getPendingDocuments } = require('../services/healthScoreEngine');
const { generateFilingReportPdf } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/actions/:businessId/whatsapp-reminder
router.post('/:businessId/whatsapp-reminder', protect, async (req, res) => {
    try {
        const { businessId } = req.params;
        const business = await Business.findByPk(businessId);
        
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const stats = await getPendingDocuments(businessId);
        
        let docListStr = stats.missing_docs.length > 0 
            ? stats.missing_docs.join(', ') 
            : 'all requested documents';

        const monthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Template: "Dear {business_name}, {pending_count} documents are missing for {current_month}. Please upload: {doc_list}. Link: {upload_url}"
        const message = `Dear ${business.business_name},\n\n${stats.pending_count} documents are missing for ${monthStr}. Please upload:\n- ${docListStr}\n\nLink: https://vyaparos.app/vault/upload`;
        
        const encodedMessage = encodeURIComponent(message);
        
        // Return the constructed wa.me link to the frontend so it can open it
        const phone = business.whatsapp_mobile || business.primary_mobile;
        
        if (!phone) {
            return res.status(400).json({ message: 'No WhatsApp or primary mobile number configured for this client.' });
        }
        
        const cleanPhone = String(phone).replace(/\D/g, '');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        res.json({ success: true, url: waUrl, message: 'WhatsApp reminder link generated' });
        
    } catch (error) {
        console.error('Error generating WhatsApp reminder:', error);
        res.status(500).json({ message: 'Server error generating WhatsApp link' });
    }
});

// GET /api/actions/:businessId/filing-report
router.get('/:businessId/filing-report', protect, generateFilingReportPdf);

module.exports = router;
