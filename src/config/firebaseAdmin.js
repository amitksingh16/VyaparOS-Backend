const admin = require('firebase-admin');

// Bhai, yahan apna Service Account JSON object paste karein
const serviceAccount = {
    "type": "service_account",
    "project_id": "vyaparos-prod",  // <--- Ye line honi hi chahiye
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "...",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "..."
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
