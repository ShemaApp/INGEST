import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';

const firebaseConfig = {
  apiKey: 'AIzaSyApo_CVmwVLHuOpfq44nlZyXfKdcWf3VrI',
  authDomain: 'ingest-manu.firebaseapp.com',
  projectId: 'ingest-manu',
  storageBucket: 'ingest-manu.firebasestorage.app',
  messagingSenderId: '369941935658',
  appId: '1:369941935658:web:25402692fda6015c45b553'
};

export const firebaseApp = initializeApp(firebaseConfig);
export { firebaseConfig };
