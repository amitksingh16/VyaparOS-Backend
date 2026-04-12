const admin = require('firebase-admin');

// 1. Apna pura Service Account JSON yahan paste kijiye
const serviceAccount = {
    "type": "service_account",
    "project_id": "vyaparos-prod",
    "private_key_id": "2cde8a30c24c50acbe786b49f6ca51c53bd2328d",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCqvLqXaMf/bHEY\nfm5Y5+G9SNk2Fqs+lCdb+ZbEVNjgti/5ftPh0KF82uOEy7edqo8woNFbIsmOBcHE\njruUqDS98JmSNWNOj0jTv1Xc3QxawJhNZccRJrfKrUrwB9a6w2b0HrhKQQ2jLx8U\nv2PQjsHPh1cOJXlcX0re3IGdBAyU3iIBTV0E0HZOKSnBI0aC1pSRASLUhKYwD/yq\nEbG8fsdMUZmeAwej6C1tcZPdW71r9f1EnnKJFgQGqg13lQUnmNO/9A//RoAj8BdO\nGlmBzlrt5YRLIf13dlPn3GK5tgtPJ7rxF1vUqM0LBu7T6JlGqlYgobJlOblCvZUQ\nDYW7huMDAgMBAAECggEAGI6c9Ie/cwdTvExRrnDqVjF4UyAZ5kjPNm/k1afx1QmZ\n8d6M4XxYAHTH562YuHvegjCHRtPvPdb/Io3Nq26GviZbzZyR2YFLXhq1jKxbNAxi\ne4i0LqKCfzYYmAM7SSaEvtT8+Gp4kywvt2oQabVhaT9+mnbHs1ezavA3+5pS/Zrk\nujlM/0AERD7xb4TgF2VuCbYXvkIdr/dTTPsNhSKreo0PSpz/ah9hOznpXSE/i9ly\n2o/ATx76/AC3/4XZYdfsShrjPcdlnlmWLYZWE9W4NcmWPq9YzFEgylYeNR7pDqRU\nn3wNh9kouaQCNkoTQeZjVHAZE9Q0NghyrkM+4GB5YQKBgQDTxI5A5Vs9BsTWgDbw\nkA3FMsuoVti4lJh2sCUZg7ap9wa3Zs6meiviAQxeh7AOcHMIQoLxr8xuJaBju5kJ\nelMwj2M0/Dhl+7CqEmwuL9OA5ruizkFWa9nCim0N29+C9V+FcoJmUX+le/4M8jvF\n7hu8FMZGa6l/e/OZvNVALLfeoQKBgQDOZjnKyC8Sspy8x1zT2PhAyplmcD21BBOK\nlbtMKNNSyd+kzkLU5BRntMAnrWcnSYUQvJoCxzpv70SNMqOgLenMLhpqzWQJ7rGF\n6HdskFGMm642xqoflEG7x0PIISpFVflQM2S60QvH2nFcP9f+HdrJ2+SKxR4IS+SJ\ncaqa322TIwKBgQCXw1pLKdOsNYilTLeSyToFI/UODEc+aMem7293DIzA29bFYvkg\nF5gRXLz3lfhXMMFPnxLmkB1Kps5+CviO8UpjF696TnNAqxKdn5xFsWK7EyBPec8b\nVyl1IO0srHFPEfhF052eJDP9bZHQx1yM6aqYrK630vpi8XrPp6OQXTvcYQKBgCS3\nFoy183m2AB+srxyYOgD8iTEpwjBTG07Jt9miYYUWmAvvDQBl2iNgidYFCJZ6g4so\noZTg78o9m8oqOeUihbZmdRiOlL8XkMirQ6MyQO9sOh9QU67uZosKtUoCbEyNMJ5N\npht9WEUi3It2Z+uyT9scnJj6247KQUsZxylpmUpVAoGBAJPfqS46oeA6zEPgJBOc\n+cq5Gr0QCohTe41dZzLfaYeqIRUDS962X3LzkC2HNUyIn/g0FnF24+huXDDHeDBX\ndsN9P59975p6+pL8rRduWyNxG2oknpiqP6/iDBDgqZ9cicwbdCNogGuPDnBgfwiX\nwrvq0JcyjpqqbGzOoyWqvFvy\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@vyaparos-prod.iam.gserviceaccount.com",
    "client_id": "109071472387520126434",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40vyaparos-prod.iam.gserviceaccount.com",
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