// Datos de la cuenta del cliente que viven SOLO en este dispositivo (localStorage), por usuario (uid).
//  · Teléfono de registro: Firebase Auth no guarda teléfonos sin verificación por SMS y no hay un backend de clientes; no se sube a Firestore
//    a propósito (las reglas de seguridad de esa base no están versionadas en el repo y guardaría datos personales a ciegas).
//  · Direcciones guardadas: el backend no expone direcciones por cliente.
// Todo va en try/catch: sin localStorage (modo privado, cuota) la función devuelve el valor vacío y la app sigue funcionando.

const PROFILE_KEY = (uid: string) => `duna_customer_profile_v1_${uid}`;
const ADDRESSES_KEY = (uid: string) => `duna_saved_addresses_v1_${uid}`;
export const MAX_SAVED_ADDRESSES = 5;

// ── Perfil (teléfono) ────────────────────────────────────────────────────────────────────────────────────────────────

export function readProfilePhone(uid: string): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(uid));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && 'phone' in parsed) {
      const phone = (parsed as { phone?: unknown }).phone;
      return typeof phone === 'string' ? phone : '';
    }
  } catch {
    /* sin perfil guardado */
  }
  return '';
}

export function saveProfilePhone(uid: string, phone: string): void {
  try {
    localStorage.setItem(PROFILE_KEY(uid), JSON.stringify({ phone }));
  } catch {
    /* no se pudo guardar: el checkout volverá a pedir el teléfono */
  }
}

// ── Direcciones guardadas ────────────────────────────────────────────────────────────────────────────────────────────

export interface SavedAddress {
  id: string;
  address: string;
  lat: number;
  lng: number;
  savedAt: number;
}

const isSavedAddress = (v: unknown): v is SavedAddress => {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  return typeof a.id === 'string' && typeof a.address === 'string' && Number.isFinite(a.lat) && Number.isFinite(a.lng) && typeof a.savedAt === 'number';
};

export function getSavedAddresses(uid: string): SavedAddress[] {
  try {
    const raw = localStorage.getItem(ADDRESSES_KEY(uid));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSavedAddress) : [];
  } catch {
    return [];
  }
}

const writeAddresses = (uid: string, list: SavedAddress[]): void => {
  try {
    localStorage.setItem(ADDRESSES_KEY(uid), JSON.stringify(list));
  } catch {
    /* sin almacenamiento: no se guarda */
  }
};

// Mismo punto (a ~1 m) = misma dirección
const samePlace = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.abs(a.lat - b.lat) < 0.00001 && Math.abs(a.lng - b.lng) < 0.00001;

/** Guarda una dirección (la más reciente arriba). Si el punto ya estaba se actualiza en vez de duplicarse; máximo `MAX_SAVED_ADDRESSES`. */
export function addSavedAddress(uid: string, input: { address: string; lat: number; lng: number }): SavedAddress[] {
  if (!uid || !Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return getSavedAddresses(uid);
  const address = input.address.trim().slice(0, 200) || `Ubicación (${input.lat.toFixed(5)}, ${input.lng.toFixed(5)})`;
  const entry: SavedAddress = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, address, lat: input.lat, lng: input.lng, savedAt: Date.now() };
  const rest = getSavedAddresses(uid).filter((a) => !samePlace(a, entry));
  const next = [entry, ...rest].slice(0, MAX_SAVED_ADDRESSES);
  writeAddresses(uid, next);
  return next;
}

export function removeSavedAddress(uid: string, id: string): SavedAddress[] {
  const next = getSavedAddresses(uid).filter((a) => a.id !== id);
  writeAddresses(uid, next);
  return next;
}
