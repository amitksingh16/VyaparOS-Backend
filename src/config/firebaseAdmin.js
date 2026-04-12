const admin = require('firebase-admin');

// 1. Apna pura Service Account JSON yahan paste kijiye
const serviceAccount = {
    "type": "service_account",
    "project_id": "vyaparos-prod",
    "private_key_id": "YOUR_PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_LONG_KEY_HERE\n-----END PRIVATE KEY-----\n",
    "client_email": "YOUR_CLIENT_EMAIL",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "YOUR_CLIENT_X509_CERT_URL"
};

/**
 * BANKER'S AUDIT: Private Key Formatting
 * PEM format expects real newlines, not the string "\n".
 */
const formatPrivateKey = (key) => {
    if (!key) return null;
    // Pehle escaped newlines ko asli newlines mein badlo
    return key.replace(/\\n/g, '\n');
};

if (!admin.apps.length) {
    try {
        const finalKey = formatPrivateKey(serviceAccount.private_key);

        admin.initializeApp({
            credential: admin.credential.cert({
                ...serviceAccount,
                private_key: finalKey
            }),
        });

        console.log('--- ✅ SUCCESS: FIREBASE ADMIN INITIALIZED MANUALLY ---');
    } catch (err) {
        console.error('--- ❌ ERROR: FIREBASE ADMIN FAILED ---');
        console.error('Message:', err.message);
    }
}

module.exports = admin;