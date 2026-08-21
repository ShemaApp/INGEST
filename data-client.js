import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseApp } from './firebase-init.js';

export const db = getFirestore(firebaseApp);
const configurationRef = doc(db, 'configuracion', 'general');

export async function loadGeneralConfiguration() {
  const snapshot = await getDoc(configurationRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveGeneralConfiguration({ values, changedKeys, actor }) {
  if (!changedKeys.length) return { changed: false };

  await runTransaction(db, async transaction => {
    const current = await transaction.get(configurationRef);
    const before = current.exists() ? current.data() : {};
    const next = {
      ...before,
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
      schemaVersion: 1
    };
    const auditRef = doc(collection(db, 'auditoria'));
    transaction.set(configurationRef, next, { merge: true });
    transaction.set(auditRef, {
      action: 'configuration.updated',
      entity: 'configuracion/general',
      actorUid: actor.uid,
      actorEmail: actor.email || null,
      changedKeys,
      before: Object.fromEntries(changedKeys.map(key => [key, before[key] ?? null])),
      after: Object.fromEntries(changedKeys.map(key => [key, values[key]])),
      createdAt: serverTimestamp(),
      immutable: true
    });
  });

  return { changed: true };
}
