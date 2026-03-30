const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  const storeId = 'store-1769421861055'; // Using the store ID from the URL
  
  console.log('Fetching products for store:', storeId);
  const productsSnap = await db.collection('products').where('storeId', '==', storeId).limit(5).get();
  
  if (productsSnap.empty) {
    console.log('No products found.');
    return;
  }

  productsSnap.forEach(doc => {
    const data = doc.data();
    if (data.modifierGroups && data.modifierGroups.length > 0) {
      console.log(`Product: ${data.name} (${doc.id})`);
      console.log('  Modifier Groups (in product):', data.modifierGroups);
      // Check type of items in modifierGroups
      data.modifierGroups.forEach((mg, idx) => {
         console.log(`    Item ${idx} type: ${typeof mg} value: ${JSON.stringify(mg)}`);
      });
    }
  });

  console.log('\nFetching Modifier Groups for store:', storeId);
  const groupsSnap = await db.collection('modifierGroups').where('storeId', '==', storeId).get();
  groupsSnap.forEach(doc => {
      console.log(`Group: ${doc.data().name} (ID: ${doc.id})`);
  });
}

checkData().catch(console.error);
