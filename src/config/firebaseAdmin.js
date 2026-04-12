const admin = require('firebase-admin');

// Bhai, yahan apna Service Account JSON object paste karein
const serviceAccount = {
  // PASTE_YOUR_JSON_OBJECT_HERE
};

if (serviceAccount && serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('--- CRITICAL: FIREBASE ADMIN INITIALIZED MANUALLY ---');
    } catch (err) {
        console.error('Firebase Admin initialization error:', err.message);
    }
}

module.exports = admin;
