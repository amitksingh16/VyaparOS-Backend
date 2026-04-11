const { ComplianceItem, Document } = require('../models');
const { Op } = require('sequelize');

/**
 * Evaluates the compliance health of a business and returns pending document requirements.
 * @param {string} businessId 
 * @returns {Promise<Object>} Object containing risk score and an array of missing documents.
 */
const getPendingDocuments = async (businessId) => {
    // 1. Fetch all compliance items for the business that are NOT filed
    const pendingCompliances = await ComplianceItem.findAll({
        where: {
            business_id: businessId,
            status: {
                [Op.ne]: 'filed'
            }
        }
    });

    const pendingDocsMap = new Map();

    // Mapping rules: What document does each compliance type need?
    // E.g., GSTR-1 requires "GST Sales", GSTR-3B requires "GST Purchase" and "GST Sales", etc.
    pendingCompliances.forEach(comp => {
        const type = comp.compliance_type.toUpperCase();
        let requiredCategories = [];

        if (type === 'GSTR-1') {
            requiredCategories.push('GST Sales');
        } else if (type === 'GSTR-3B') {
            requiredCategories.push('GST Sales');
            requiredCategories.push('GST Purchase');
        } else if (type === 'TDS') {
            requiredCategories.push('Bank Statements');
        } else {
            // Generic fallback - just ask for general documents for that month
            requiredCategories.push('Other Documents');
        }

        const monthStr = comp.due_date ? comp.due_date.toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
        
        requiredCategories.forEach(category => {
            const key = `${category}|${monthStr}`;
            pendingDocsMap.set(key, { category, month: monthStr, compliance_type: type });
        });
    });

    // 2. Fetch documents uploaded by the business to see what's already provided
    const uploadedDocs = await Document.findAll({
        where: { business_id: businessId }
    });

    // We build a set of "Category|Month" that the client has already uploaded
    const uploadedSet = new Set(uploadedDocs.map(doc => `${doc.category}|${doc.month}`));

    // 3. Subtract uploaded from required to find what's missing
    const missingDocs = [];
    pendingDocsMap.forEach((val, key) => {
        if (!uploadedSet.has(key)) {
            missingDocs.push(`${val.category} (for ${val.compliance_type})`);
        }
    });

    return {
        pending_count: missingDocs.length,
        missing_docs: missingDocs,
        total_pending_compliances: pendingCompliances.length
    };
};

module.exports = {
    getPendingDocuments
};
