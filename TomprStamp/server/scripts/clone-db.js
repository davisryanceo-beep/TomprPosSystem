
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to keys (assuming script is in server/scripts/)
const PROD_KEY_PATH = join(__dirname, '../../firebase-key.json');
const DEV_KEY_PATH = join(__dirname, '../../firebase-key-dev.json');

console.log(`Loading keys from:\nProd: ${PROD_KEY_PATH}\nDev: ${DEV_KEY_PATH}`);

const prodAccount = JSON.parse(readFileSync(PROD_KEY_PATH, 'utf8'));
const devAccount = JSON.parse(readFileSync(DEV_KEY_PATH, 'utf8'));

// Initialize Prod App (Source)
const prodApp = admin.initializeApp({
    credential: admin.credential.cert(prodAccount)
}, 'prod');

// Initialize Dev App (Dest)
const devApp = admin.initializeApp({
    credential: admin.credential.cert(devAccount)
}, 'dev');

const dbProd = prodApp.firestore();
const dbDev = devApp.firestore();

async function copyCollection(collectionName) {
    console.log(`Processing collection: ${collectionName}`);
    const snapshot = await dbProd.collection(collectionName).get();

    if (snapshot.empty) {
        console.log(`  - Empty, skipping.`);
        return;
    }

    const docs = snapshot.docs;
    const total = docs.length;
    console.log(`  - Found ${total} documents.`);

    const BATCH_SIZE = 400; // Limit is 500, playing it safe
    let batch = dbDev.batch();
    let count = 0;
    let batchCount = 0;

    for (const doc of docs) {
        const ref = dbDev.collection(collectionName).doc(doc.id);
        batch.set(ref, doc.data());
        count++;
        batchCount++;

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`    - Committed batch of ${batchCount} docs...`);
            batch = dbDev.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`    - Committed final batch of ${batchCount} docs.`);
    }

    console.log(`  > Completed ${collectionName}.`);
}

async function main() {
    try {
        console.log("Starting Database Clone (Prod -> Dev)...");
        const collections = await dbProd.listCollections();

        if (collections.length === 0) {
            console.log("No collections found in Production.");
            return;
        }

        for (const col of collections) {
            await copyCollection(col.id);
        }

        console.log("\nDatabase cloning completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

main();
