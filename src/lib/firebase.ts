import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebaseApp';

// La app (una sola instancia) se inicializa en `firebaseApp.ts`; aquí solo se agrega Firestore.
export const db = getFirestore(firebaseApp);
