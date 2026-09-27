'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { googleClientId } from '@/services/authService';

// Botón "Continuar con Google". Dos caminos:
//  · Con `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: botón oficial de Google Identity Services (1 clic). GIS entrega un `credential` (ID token de Google) que
//    se pasa a `onCredential` -> `loginWithGoogle(credentialToken)`. El botón lo dibuja Google en un iframe (no admite estilos propios): se pide
//    con `text: 'continue_with'` y `locale: 'es'` para que diga "Continuar con Google".
//  · Sin Client ID, o si el script de Google no carga (bloqueador de anuncios, sin red): botón propio con el isotipo de Google que abre la
//    ventana emergente de Firebase (`onPopup`).

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GsiCredentialResponse { credential?: string }
interface GsiButtonOptions {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  logo_alignment: 'left';
  width: number;
  locale: string;
}
interface GsiId {
  initialize: (config: { client_id: string; callback: (response: GsiCredentialResponse) => void; auto_select: boolean; cancel_on_tap_outside: boolean }) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void;
}
const getGsi = (): GsiId | undefined => (window.google as { accounts?: { id?: GsiId } } | undefined)?.accounts?.id;

let gsiScript: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (getGsi()) return Promise.resolve();
  if (!gsiScript) {
    gsiScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => (getGsi() ? resolve() : reject(new Error('gsi-unavailable')));
      script.onerror = () => reject(new Error('gsi-blocked'));
      document.head.appendChild(script);
    });
    gsiScript.catch(() => { gsiScript = null; }); // permite reintentar
  }
  return gsiScript;
}

// GIS se inicializa UNA vez por página (varias llamadas a initialize() avisan en consola); el callback vigente se guarda aparte
let initializedWith = '';
let activeCallback: ((credential: string) => void) | null = null;
function initGsi(gsi: GsiId, clientId: string) {
  if (initializedWith === clientId) return;
  gsi.initialize({
    client_id: clientId,
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => { if (response.credential && activeCallback) activeCallback(response.credential); },
  });
  initializedWith = clientId;
}

function GoogleIsotype() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** Token de Google Identity Services (camino con Client ID). */
  onCredential: (credentialToken: string) => void;
  /** Ventana emergente de Firebase (camino sin Client ID o con el script de Google bloqueado). */
  onPopup: () => void;
  disabled?: boolean;
}

export default function GoogleSignInButton({ onCredential, onPopup, disabled }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 'loading' = preparando el botón oficial · 'gsi' = botón oficial dibujado · 'fallback' = botón propio
  const [mode, setMode] = useState<'loading' | 'gsi' | 'fallback'>(googleClientId ? 'loading' : 'fallback');

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        const gsi = getGsi();
        const container = containerRef.current;
        if (cancelled || !gsi || !container) return;
        initGsi(gsi, googleClientId);
        gsi.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.max(200, Math.min(400, Math.floor(container.clientWidth || 320))),
          locale: 'es',
        });
        setMode('gsi');
      })
      .catch(() => { if (!cancelled) setMode('fallback'); });
    return () => { cancelled = true; };
  }, []);

  // El callback de GIS es global a la página: se apunta siempre al del botón montado (y se suelta al desmontar)
  useEffect(() => {
    activeCallback = (credential) => { if (!disabled) onCredential(credential); };
    return () => { activeCallback = null; };
  }, [onCredential, disabled]);

  if (mode === 'fallback') {
    return (
      <button
        type="button"
        onClick={onPopup}
        disabled={disabled}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        <GoogleIsotype />
        Continuar con Google
      </button>
    );
  }

  return (
    <div className={`relative h-11 w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Contenedor del botón oficial de Google (iframe); mientras se prepara se ve un esqueleto del mismo tamaño */}
      <div ref={containerRef} className="flex h-11 w-full items-center justify-center" data-testid="gsi-button" />
      {mode === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparando Google…
        </div>
      )}
    </div>
  );
}
