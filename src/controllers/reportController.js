const PDFDocument = require('pdfkit');
const { ComplianceItem, Business } = require('../models');

// @desc    Generate a PDF Filing Report for a Business
// @route   GET /api/actions/:businessId/filing-report
// @access  Private (Needs auth middleware in production, assume passed here)
const generateFilingReportPdf = async (req, res) => {
    try {
        const { businessId } = req.params;

        const business = await Business.findByPk(businessId);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const compliances = await ComplianceItem.findAll({
            where: { business_id: businessId },
            order: [['due_date', 'ASC']]
        });

        // Initialize PDFKit
        const doc = new PDFDocument({ margin: 50 });
        
        // Setup headers for PDF stream download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${business.business_name.replace(/\s+/g, '_')}_Filing_Report.pdf"`);
        
        // Pipe the document to the response
        doc.pipe(res);

        // Branding
        doc.fontSize(24).fillColor('#002D50').text('VyaparOS', { align: 'center' });
        doc.fontSize(10).fillColor('#E08A00').text('Compliance Infrastructure', { align: 'center' });
        doc.moveDown(2);

        // Title
        doc.fontSize(18).fillColor('#333333').text('Official Filing Report', { align: 'left', underline: true });
        doc.moveDown(0.5);

        // Client Info
        doc.fontSize(12).text(`Client: ${business.business_name}`);
        doc.text(`GSTIN/PAN: ${business.gstin || business.pan || 'N/A'}`);
        doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`);
        doc.moveDown(2);

        // Table simulation
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Compliance Type', 50, doc.y, { continued: true, width: 150 });
        doc.text('Due Date', 200, doc.y, { continued: true, width: 150 });
        doc.text('Status', 350, doc.y);
        
        doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
        doc.moveDown(1);

        // Data Rows
        doc.font('Helvetica').fontSize(10);
        
        if (compliances.length === 0) {
            doc.text('No compliance records found for this client.', 50, doc.y);
        } else {
            compliances.forEach(item => {
                const dateStr = item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN') : 'TBA';
                const typeText = item.compliance_type ? item.compliance_type.toUpperCase() : 'UNKNOWN';
                
                doc.text(typeText, 50, doc.y, { continued: true, width: 150 });
                doc.text(dateStr, 200, doc.y, { continued: true, width: 150 });
                
                // Color code status
                let color = '#333333';
                if (item.status === 'filed') color = '#22c55e'; // Green
                if (item.status === 'overdue') color = '#ef4444'; // Red
                if (item.status === 'pending') color = '#f59e0b'; // Amber
                
                doc.fillColor(color).text(item.status ? item.status.toUpperCase() : 'UNKNOWN', 350, doc.y);
                doc.fillColor('#333333'); // Reset
                doc.moveDown(0.5);
            });
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(8).fillColor('gray').text('This is a highly-secure, automatically generated report powered by VyaparOS. Data shown is based on the platform\'s real-time trackers at the moment of generation.', { align: 'center' });

        // Finalize
        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error generating PDF' });
        }
    }
};

module.exports = {
    generateFilingReportPdf
};
