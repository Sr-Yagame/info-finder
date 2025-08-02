import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  databaseURL: process.env.FIREBASE_DB_URL
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
