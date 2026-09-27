// Validaciones de los formularios de autenticación (puras, sin React ni red). El servidor (Firebase) vuelve a validar: esto solo evita
// viajes inútiles y da mensajes claros en español.

// Igual al mínimo de Firebase Authentication (6): la interfaz no exige más que el servidor ni da un mensaje distinto del suyo
export const PASSWORD_MIN_LENGTH = 6;

export const PHONE_PREFIXES = ['+58', '+57', '+1'] as const;
export type PhonePrefix = (typeof PHONE_PREFIXES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Escribe tu correo electrónico.';
  if (!EMAIL_RE.test(value)) return 'Ese correo no parece válido. Revísalo.';
  return null;
}

export function validatePassword(password: string, mode: 'login' | 'register'): string | null {
  if (!password) return 'Escribe tu contraseña.';
  if (mode === 'register' && password.length < PASSWORD_MIN_LENGTH) return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Escribe tu nombre completo.';
  if (value.length < 3) return 'Escribe tu nombre completo.';
  return null;
}

/** Deja solo los dígitos del número nacional; quita el 0 inicial ("0412…") y el prefijo país si el cliente lo escribió completo. */
export function nationalDigits(input: string, prefix: PhonePrefix): string {
  let digits = input.replace(/\D/g, '');
  const country = prefix.replace('+', '');
  if (digits.startsWith(country) && digits.length > 10) digits = digits.slice(country.length);
  return digits.replace(/^0+/, '');
}

export function validatePhone(input: string, prefix: PhonePrefix): string | null {
  const digits = nationalDigits(input, prefix);
  if (!digits) return 'Escribe tu número de WhatsApp.';
  if (digits.length !== 10) return 'El número debe tener 10 dígitos (ej. 4121234567).';
  if (prefix === '+58' && !digits.startsWith('4')) return 'Un celular venezolano empieza por 4 (ej. 4121234567).';
  return null;
}

/** Teléfono en formato internacional (`+584121234567`), el mismo que usa el checkout. Devuelve '' si no es válido. */
export function toInternationalPhone(input: string, prefix: PhonePrefix): string {
  return validatePhone(input, prefix) ? '' : `${prefix}${nationalDigits(input, prefix)}`;
}
