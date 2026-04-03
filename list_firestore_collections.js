import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./TomprStamp/firebase-key.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const firestore = admin.firestore();

async function listCollections() {
    const collections = await firestore.listCollections();
    console.log('Found collections:');
    collections.forEach(collection => {
        console.log(`- ${collection.id}`);
    });
    process.exit(0);
}

listCollections().catch(err => {
    console.error('Error listing collections:', err);
    process.exit(1);
});
