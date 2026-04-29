/**
 * Firebase client SDK — inizializzazione singleton per l'app Expo.
 *
 * Servizi esposti:
 *   - db       → Firestore (letture real-time, query)
 *   - storage  → Firebase Storage (upload media lato client)
 *
 * Nota: la maggior parte delle operazioni viene gestita dal backend Express
 * tramite l'Admin SDK. Questo modulo serve per query real-time e upload
 * diretti dall'app (es. ascolto live del mood di un evento).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore }                   from 'firebase/firestore';
import { getStorage }                     from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

// Evita re-inizializzazioni (hot reload in Expo)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
