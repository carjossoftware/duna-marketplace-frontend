// Configuración de Firebase leída de las variables de entorno (sin importar el SDK: este archivo va en el bundle inicial).
//
// Hay DOS configuraciones posibles:
//  · `baseFirebaseConfig` (NEXT_PUBLIC_FIREBASE_*): la app por defecto. Hoy la usa Firestore (salas de "Pedido entre panas", vía /api/combo).
//  · `authFirebaseConfig` (NEXT_PUBLIC_AUTH_FIREBASE_*): OPCIONAL. Si se define NEXT_PUBLIC_AUTH_FIREBASE_API_KEY, la autenticación de clientes
//    usa ese proyecto (todo el conjunto AUTH_FIREBASE_*: api key, dominio, proyecto y app id juntos, sin mezclar con la base) y Firestore sigue en el suyo.
//    Sin esas variables, Auth usa la misma app que Firestore. Sirve para que las cuentas vivan en su propio proyecto sin mover las salas de combos.
//
// Cada variable se referencia de forma literal (`process.env.NEXT_PUBLIC_X`): así Next las incrusta al compilar.

export interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export const baseFirebaseConfig: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Auth en su propio proyecto (se activa con NEXT_PUBLIC_AUTH_FIREBASE_API_KEY). */
export const usesDedicatedAuthProject: boolean = Boolean(process.env.NEXT_PUBLIC_AUTH_FIREBASE_API_KEY);

export const authFirebaseConfig: FirebaseWebConfig = usesDedicatedAuthProject
  ? {
      apiKey: process.env.NEXT_PUBLIC_AUTH_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_AUTH_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_AUTH_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_AUTH_FIREBASE_APP_ID,
    }
  : baseFirebaseConfig;

/** La configuración de Auth tiene lo mínimo para funcionar (api key, dominio y proyecto). */
export const isAuthConfigComplete: boolean = Boolean(authFirebaseConfig.apiKey && authFirebaseConfig.authDomain && authFirebaseConfig.projectId);
