const admin = require("firebase-admin");
console.log("ENV FULL CHECK:", Object.keys(process.env));
console.log("FIREBASE VALUE:", process.env.FIREBASE_SERVICE_ACCOUNT);
console.log("🔥 FIREBASE ADMIN FILE LOADED");

let serviceAccount;

try {
    // Load from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Fix newline issue in private key
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log("Firebase Project:", serviceAccount.project_id);
    }
} catch (err) {
    console.error("❌ Firebase config parse error:", err.message);
}

if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log("🔥 Firebase Admin Initialized Successfully");
} else {
    console.warn("⚠️ Firebase Admin already initialized or missing config");
}

module.exports = admin;
