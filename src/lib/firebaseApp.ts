import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { authFirebaseConfig, baseFirebaseConfig, usesDedicatedAuthProject } from './firebaseConfig';

// App de Firebase por defecto (una sola instancia). Vive aparte de `firebase.ts` (que suma Firestore) para que la autenticación
// —que se carga en todas las páginas— no arrastre Firestore al bundle inicial.
export const firebaseApp: FirebaseApp = !getApps().length ? initializeApp(baseFirebaseConfig) : getApp();

const AUTH_APP_NAME = 'duna-auth';

/**
 * App que usa la autenticación de clientes: la misma app por defecto, o —si se definieron NEXT_PUBLIC_AUTH_FIREBASE_*— una app aparte con
 * el proyecto de las cuentas (Firestore no se mueve). Ver `firebaseConfig.ts`.
 */
export function getAuthFirebaseApp(): FirebaseApp {
  if (!usesDedicatedAuthProject) return firebaseApp;
  return getApps().find((app) => app.name === AUTH_APP_NAME) ?? initializeApp(authFirebaseConfig, AUTH_APP_NAME);
}
