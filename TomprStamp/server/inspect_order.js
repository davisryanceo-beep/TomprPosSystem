import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('../firebase-key.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const doc = await db.collection('orders').doc('order-1769431326910').get();
const data = doc.data();
console.log('Raw Firestore order document:');
console.log(JSON.stringify(data, (k, v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return v;
}, 2));
process.exit(0);
