
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('../firebase-key.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testConnection() {
    try {
        console.log('Attempting to write to Firestore...');
        const docRef = db.collection('test_connection').doc('ping');
        await docRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: 'Hello from verification script'
        });
        console.log('Write successful!');

        console.log('Attempting to read from Firestore...');
        const doc = await docRef.get();
        if (doc.exists) {
            console.log('Read successful:', doc.data());
        } else {
            console.log('Read failed: Document not found');
        }
    } catch (error) {
        console.error('Firestore connection failed:', error);
        process.exit(1);
    }
}

testConnection();
