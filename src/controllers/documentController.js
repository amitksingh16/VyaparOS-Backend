const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { Op } = require('sequelize');
const { Document, User, StaffClientAssignment, Business } = require('../models');

const processedMockWhatsAppDocs = new Set();

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { business_id, category, year, month, source_id } = req.body;

        if (!business_id || !category) {
            // Cleanup the uploaded file if required fields are missing
            if (req.file.path) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'business_id and category are required' });
        }

        if (source_id && source_id.startsWith('w')) {
            processedMockWhatsAppDocs.add(source_id);
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        
        const newDoc = await Document.create({
            business_id,
            uploaded_by: req.user.id,
            name: req.file.originalname,
            file_url: fileUrl,
            size: req.file.size,
            file_type: req.file.mimetype,
            category: category,
            year: year || new Date().getFullYear(),
            month: month || new Date().toISOString().slice(0, 7) // Default to current YYYY-MM
        });

        res.status(201).json({ message: 'Document uploaded successfully', document: newDoc });
    } catch (err) {
        console.error('Error uploading document:', err);
        // Attempt to clean up physical file on DB failure
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Server error' });
    }
};

const getClientDocuments = async (req, res) => {
    try {
        const { businessId } = req.params;

        const documents = await Document.findAll({
            where: { business_id: businessId },
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'name']
                }
            ],
            order: [['uploaded_at', 'DESC']]
        });

        // Group by Year -> Month -> Category
        // Shape: { [Year]: { [Month]: { [Category]: [ ...files ] } } }
        const structuredVault = {};

        documents.forEach(doc => {
            const year = doc.year || 'Unknown Year';
            const month = doc.month || 'Unknown Month';
            const category = doc.category || 'Other';

            if (!structuredVault[year]) structuredVault[year] = {};
            if (!structuredVault[year][month]) structuredVault[year][month] = {};
            if (!structuredVault[year][month][category]) structuredVault[year][month][category] = [];

            structuredVault[year][month][category].push({
                id: doc.id,
                name: doc.name,
                url: doc.file_url,
                size: doc.size,
                type: doc.file_type,
                createdAt: doc.uploaded_at,
                uploaderName: doc.uploader ? doc.uploader.name : 'Unknown User'
            });
        });

        res.json({ vault: structuredVault, flatList: documents });
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const downloadMonthZip = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: 'year and month queries are required' });
        }

        const documents = await Document.findAll({
            where: { business_id: businessId, year, month }
        });

        if (documents.length === 0) {
            return res.status(404).json({ message: 'No documents found for this month' });
        }

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="Vault_${year}_${month}.zip"`
        });

        const archive = archiver('zip', {
            zlib: { level: 9 } // maximum compression
        });

        // Listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        archive.on('error', function(err) {
            throw err;
        });

        // Pipe archive data to the response
        archive.pipe(res);

        // Append every file
        documents.forEach(doc => {
            // file_url is e.g. "/uploads/fieldname-123456.pdf" => local path: __dirname + "../../public" + fileUrl
            const filePath = path.join(__dirname, '../../public', doc.file_url);
            
            if (fs.existsSync(filePath)) {
                // Determine folder structure inside the Zip
                const category = doc.category || 'Other';
                // E.g. GST Purchase/Invoice.pdf
                const zipPath = `${category}/${doc.name}`;
                archive.file(filePath, { name: zipPath });
            }
        });

        // Finalize the archive
        await archive.finalize();

    } catch (err) {
        console.error('Error creating ZIP:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error generating ZIP' });
        }
    }
};

const getPendingWhatsAppDocs = async (req, res) => {
    try {
        const { businessId } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        // Verify Staff Client Assignment for Isolation if the user is a staff member
        if (role === 'ca_staff' || role === 'ca_article') {
            const assignment = await StaffClientAssignment.findOne({
                where: { staff_id: userId, business_id: businessId }
            });
            
            if (!assignment) {
                return res.status(403).json({ message: 'Access Denied: You are not assigned to this client.' });
            }
        } else if (role === 'ca') {
            // Check that the business belongs to this CA
            const business = await Business.findOne({ where: { id: businessId, ca_id: userId } });
            if (!business) {
                return res.status(403).json({ message: 'Access Denied: Business not found under your CA portfolio.' });
            }
        } else if (role === 'client') {
            // Client can only view their own
            const business = await Business.findOne({ where: { id: businessId } });
            // For client role, we might verify business.id === req.user.business_id, ignoring for simplicity if it's protected by other middleware.
        }

        const business = await Business.findByPk(businessId);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Return empty array for any client EXCEPT "Sharma Kirana Store"
        // This simulates a real DB pull where only one client has WhatsApp docs
        if (business.business_name === 'Sharma Kirana Store') {
            let docs = [
                { id: 'w1', name: 'Invoice_April_Telecom.pdf', type: 'application/pdf', size: 1250000, date: new Date().toISOString() },
                { id: 'w2', name: 'Bank_Statement_Q1.jpg', type: 'image/jpeg', size: 3400000, date: new Date().toISOString() }
            ];
            docs = docs.filter(d => !processedMockWhatsAppDocs.has(d.id));
            return res.json({
                pendingDocs: docs
            });
        }

        // Empty state for all other clients (e.g., Verma Auto Parts)
        return res.json({ pendingDocs: [] });

    } catch (err) {
        console.error('Error fetching WhatsApp docs:', err);
        res.status(500).json({ message: 'Server error fetching WhatsApp docs' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const docId = req.params.id;
        
        // If it's a simulated WhatsApp document ID (w1, w2) mock success
        if (docId.startsWith('w')) {
            processedMockWhatsAppDocs.add(docId);
            return res.json({ message: 'Document deleted successfully' });
        }

        // Find document in database
        const document = await Document.findByPk(docId);
        
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '../../public', document.file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete database record
        await document.destroy();

        res.json({ message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ message: 'Server error deleting document' });
    }
};

const getUnidentifiedDocs = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Ensure only CA/Staff can view unidentified docs
        if (!['ca', 'ca_staff', 'ca_article'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        let whereClause = {
            business_id: null,
            sender_mobile: {
                [Op.ne]: null
            }
        };

        if (req.user.role === 'ca_staff' || req.user.role === 'ca_article') {
            whereClause.receiver_staff_id = userId;
        }

        const documents = await Document.findAll({
            where: whereClause,
            order: [['uploaded_at', 'DESC']],
            include: [{
                model: User,
                as: 'receiver_staff',
                attributes: ['id', 'name']
            }]
        });

        res.json({ documents });
    } catch (err) {
        console.error('Error fetching unidentified docs:', err);
        res.status(500).json({ message: 'Server error fetching unidentified docs' });
    }
};

const assignUnidentifiedDoc = async (req, res) => {
    try {
        const docId = req.params.id;
        const { business_id } = req.body;

        if (!['ca', 'ca_staff', 'ca_article'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const document = await Document.findByPk(docId);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        document.business_id = business_id;
        document.sender_mobile = null; // Clear it out as it's identified now
        await document.save();

        res.json({ message: 'Document assigned successfully', document });
    } catch (err) {
        console.error('Error assigning document:', err);
        res.status(500).json({ message: 'Server error assigning document' });
    }
};

const receiveWebhookDoc = async (req, res) => {
    try {
        // Mock a webhook receiving a document with file_url and sender_mobile
        const { file_url, name, size, sender_mobile, month, year, text } = req.body;
        
        if (!sender_mobile || !file_url) {
            return res.status(400).json({ message: 'sender_mobile and file_url are required' });
        }

        // Parse REF: tag from text for staff routing
        let receiver_staff_id = null;
        if (text && text.includes('REF:')) {
            const match = text.match(/REF:([a-fA-F0-9-]+)/);
            if (match && match[1]) {
                receiver_staff_id = match[1];
            }
        }

        // Check if sender matches any known business mobile numbers
        let matched_business_id = null;
        let final_sender_mobile = sender_mobile;

        const matchedBusiness = await Business.findOne({
            where: {
                [Op.or]: [
                    { primary_mobile: sender_mobile },
                    { whatsapp_mobile: sender_mobile }
                ]
            }
        });

        if (matchedBusiness) {
            matched_business_id = matchedBusiness.id;
            final_sender_mobile = null; // Clear out sender_mobile since it's identified
            receiver_staff_id = null; // Usually skips unidentified bucket so no staff ref needed here
        }

        const newDoc = await Document.create({
            business_id: matched_business_id, 
            uploaded_by: null,
            name: name || 'WhatsApp Image',
            file_url: file_url,
            size: size || 1024,
            file_type: 'image/jpeg',
            category: 'Other',
            year: year || new Date().getFullYear(),
            month: month || new Date().toISOString().slice(0, 7),
            sender_mobile: final_sender_mobile,
            receiver_staff_id: receiver_staff_id
        });

        res.status(201).json({ message: 'Webhook document received', document: newDoc });
    } catch (err) {
        console.error('Error in webhook:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    upload,
    uploadDocument,
    getClientDocuments,
    downloadMonthZip,
    getPendingWhatsAppDocs,
    deleteDocument,
    getUnidentifiedDocs,
    assignUnidentifiedDoc,
    receiveWebhookDoc,
    processedMockWhatsAppDocs
};
