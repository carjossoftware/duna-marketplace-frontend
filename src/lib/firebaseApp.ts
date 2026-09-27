import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

// App de Firebase compartida (una sola instancia). Vive aparte de `firebase.ts` (que suma Firestore) para que la autenticación
// —que se carga en todas las páginas— no arrastre Firestore al bundle inicial.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
