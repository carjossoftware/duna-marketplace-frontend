import type { Auth, User } from 'firebase/auth';
import { readProfilePhone, saveProfilePhone } from '@/lib/customerProfile';

// Servicio de autenticación de clientes sobre Firebase Authentication (decisión del 2026-09-26: el contrato de AdonisJS no define cuentas de
// cliente). Es la ÚNICA pieza que conoce a Firebase: si un día el backend expone cuentas propias, se reemplaza este archivo y el contexto,
// el modal y la cabecera no cambian.
//
// Firebase se carga bajo demanda (import dinámico) para no sumar el SDK al bundle inicial de cada página.
// La sesión se persiste en el navegador (IndexedDB/localStorage, lo administra el SDK) y se restaura sola al recargar (`onIdTokenChanged`).

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  /** Teléfono internacional (`+58…`) guardado en ESTE dispositivo al registrarse; '' si no se conoce (login en otro dispositivo, Google). */
  phone: string;
  photoUrl: string | null;
  provider: 'password' | 'google' | 'other';
}

export interface AuthSession {
  user: AuthUser;
  /** ID token de Firebase (se renueva solo cada ~1 h). Hoy NO se envía a AdonisJS: el contrato de compra no lo pide. */
  token: string;
}

/** Error de autenticación con mensaje ya en español, listo para mostrarse. `code === 'cancelled'` = el cliente cerró la ventana: no es un error. */
export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Se ofrece inicio de sesión solo si Firebase está configurado (variables NEXT_PUBLIC_FIREBASE_*). Interruptor: `NEXT_PUBLIC_AUTH_ENABLED=false` lo oculta
 * aunque Firebase esté configurado (útil mientras Authentication no esté habilitado en la consola de Firebase: sin eso todo intento de ingreso falla).
 */
export const isAuthAvailable: boolean = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false'
);

/** Client ID de Google Identity Services (botón "Continuar con Google" de 1 clic). Sin él se usa la ventana emergente de Firebase. */
export const googleClientId: string = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

type FirebaseAuthSdk = typeof import('firebase/auth');
interface AuthRuntime {
  sdk: FirebaseAuthSdk;
  auth: Auth;
}

// SOLO PARA PRUEBAS LOCALES: con `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` la app habla con el emulador de Firebase Auth (sin tocar
// el proyecto real). Sin la variable (producción) no hace nada.
const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '';

let runtimePromise: Promise<AuthRuntime> | null = null;
function loadAuth(): Promise<AuthRuntime> {
  if (!isAuthAvailable) return Promise.reject(new AuthError('unavailable', 'El inicio de sesión no está disponible por ahora.'));
  if (!runtimePromise) {
    runtimePromise = Promise.all([import('firebase/auth'), import('@/lib/firebaseApp')]).then(([sdk, { firebaseApp }]) => {
      const auth = sdk.getAuth(firebaseApp);
      if (authEmulatorHost) sdk.connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
      return { sdk, auth };
    });
    runtimePromise.catch(() => { runtimePromise = null; }); // permite reintentar si falló la descarga del SDK
  }
  return runtimePromise;
}

// ── Errores ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const errorCode = (err: unknown): string =>
  typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string' ? (err as { code: string }).code : '';

/** `via`: 'google' cuando el error viene del ingreso con Google (una credencial inválida no es una "contraseña incorrecta"). */
export function toAuthError(err: unknown, via?: 'google'): AuthError {
  if (err instanceof AuthError) return err;
  const code = errorCode(err);
  if (via === 'google' && (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/invalid-idp-response')) {
    return new AuthError(code, 'No pudimos iniciar sesión con Google. Inténtalo de nuevo o ingresa con tu correo.');
  }
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return new AuthError(code, 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.');
    case 'auth/invalid-email':
      return new AuthError(code, 'Ese correo no parece válido. Revísalo.');
    case 'auth/email-already-in-use':
      return new AuthError(code, 'Ya existe una cuenta con ese correo. Inicia sesión en su lugar.');
    case 'auth/account-exists-with-different-credential':
      return new AuthError(code, 'Ese correo ya está registrado con otro método de ingreso. Prueba con Google o con tu contraseña.');
    case 'auth/weak-password':
      return new AuthError(code, 'La contraseña es muy débil. Usa al menos 8 caracteres.');
    case 'auth/user-disabled':
      return new AuthError(code, 'Esta cuenta está deshabilitada. Comunícate con soporte de D\'una.');
    case 'auth/too-many-requests':
      return new AuthError(code, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
    case 'auth/network-request-failed':
      return new AuthError(code, 'No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.');
    case 'auth/popup-blocked':
      return new AuthError(code, 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return new AuthError('cancelled', '');
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/admin-restricted-operation':
      return new AuthError(code, 'Este método de ingreso aún no está habilitado. Inténtalo con otro o más tarde.');
    case 'auth/unauthorized-domain':
      return new AuthError(code, 'Este sitio todavía no está autorizado para iniciar sesión con Google. Usa tu correo por ahora.');
    case 'auth/invalid-app-credential':
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
      return new AuthError(code, 'El inicio de sesión no está disponible en este momento. Inténtalo más tarde.');
    default:
      // Nunca se muestra el código técnico crudo al cliente
      return new AuthError(code || 'unknown', 'No pudimos completar la operación. Inténtalo de nuevo en unos minutos.');
  }
}

// ── Sesión ───────────────────────────────────────────────────────────────────────────────────────────────────────────

function toAuthUser(user: User): AuthUser {
  const providerId = user.providerData[0]?.providerId ?? '';
  const email = user.email ?? '';
  return {
    uid: user.uid,
    name: user.displayName?.trim() || (email ? email.split('@')[0] : 'Cliente'),
    email,
    phone: readProfilePhone(user.uid),
    photoUrl: user.photoURL || null,
    provider: providerId === 'password' ? 'password' : providerId === 'google.com' ? 'google' : 'other',
  };
}

async function toSession(user: User): Promise<AuthSession> {
  return { user: toAuthUser(user), token: await user.getIdToken() };
}

// Durante el registro se ignora el evento de "sesión iniciada" del SDK: llega ANTES de guardar nombre y teléfono y mostraría un instante
// una cuenta sin nombre. `registerWithEmail` devuelve la sesión completa.
let registering = false;

/** Escucha la sesión: entrega la del cliente al iniciar/restaurar/renovar el token y `null` al cerrar sesión. Devuelve la función para dejar de escuchar. */
export async function subscribeToSession(onSession: (session: AuthSession | null) => void): Promise<() => void> {
  const { sdk, auth } = await loadAuth();
  let sequence = 0;
  return sdk.onIdTokenChanged(auth, (user) => {
    if (registering) return;
    const mine = ++sequence;
    if (!user) {
      onSession(null);
      return;
    }
    toSession(user)
      .then((session) => { if (mine === sequence) onSession(session); })
      .catch(() => { if (mine === sequence) onSession(null); });
  });
}

// ── Acciones ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  try {
    const { sdk, auth } = await loadAuth();
    const cred = await sdk.signInWithEmailAndPassword(auth, email.trim(), password);
    return await toSession(cred.user);
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function registerWithEmail(input: { name: string; email: string; password: string; phone: string }): Promise<AuthSession> {
  registering = true;
  try {
    const { sdk, auth } = await loadAuth();
    const cred = await sdk.createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    // La cuenta ya existe: si el nombre no se puede guardar no se falla el registro (queda el prefijo del correo y se corrige al comprar)
    try {
      await sdk.updateProfile(cred.user, { displayName: input.name.trim() });
    } catch { /* nombre por defecto */ }
    if (input.phone) saveProfilePhone(cred.user.uid, input.phone);
    return await toSession(cred.user);
  } catch (err) {
    throw toAuthError(err);
  } finally {
    registering = false;
  }
}

/** Inicio de sesión con el token (`credential`) que entrega Google Identity Services al pulsar su botón. */
export async function loginWithGoogleCredential(credentialToken: string): Promise<AuthSession> {
  try {
    const { sdk, auth } = await loadAuth();
    const cred = await sdk.signInWithCredential(auth, sdk.GoogleAuthProvider.credential(credentialToken));
    return await toSession(cred.user);
  } catch (err) {
    throw toAuthError(err, 'google');
  }
}

/** Inicio de sesión con Google por ventana emergente de Firebase (no requiere el Client ID de Google Identity Services). */
export async function loginWithGooglePopup(): Promise<AuthSession> {
  try {
    const { sdk, auth } = await loadAuth();
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await sdk.signInWithPopup(auth, provider);
    return await toSession(cred.user);
  } catch (err) {
    throw toAuthError(err, 'google');
  }
}

export async function logout(): Promise<void> {
  try {
    const { sdk, auth } = await loadAuth();
    await sdk.signOut(auth);
  } catch (err) {
    throw toAuthError(err);
  }
}
