const fs = require('fs');
for (const file of ['firebase.json', '.firebaserc', 'firestore.indexes.json']) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}
console.log('config-json-ok');
