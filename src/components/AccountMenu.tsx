'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ClipboardList, LogOut, MapPin, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/services/authService';

// Control de cuenta de la cabecera: sin sesión = botón "Iniciar Sesión" (abre el AuthModal); con sesión = avatar/inicial + menú con
// Mis Pedidos, Direcciones Guardadas y Cerrar Sesión. Si Firebase no está configurado no dibuja nada; mientras se restaura la sesión guardada
// muestra un esqueleto (para no parpadear "Iniciar Sesión" a quien ya está dentro). Las dos primeras opciones las resuelve quien lo monta.

interface AccountMenuProps {
  onOpenOrders: () => void;
  onOpenAddresses: () => void;
  className?: string;
  /** Cuándo se ve el texto "Iniciar Sesión" (clases de Tailwind); antes solo se ve el icono. Cada lugar donde se monta tiene su propio espacio. */
  loginLabelClassName?: string;
}

function Avatar({ user, size }: { user: AuthUser; size: 'sm' | 'md' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = (user.name.trim().charAt(0) || user.email.charAt(0) || '?').toUpperCase();
  const box = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';
  if (user.photoUrl && !imageFailed) {
    return (
      // Las fotos de Google bloquean el hotlink si se envía el referer
      <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className={`${box} shrink-0 rounded-full object-cover`} />
    );
  }
  return <span className={`${box} flex shrink-0 items-center justify-center rounded-full bg-[#fe6712] font-black text-white`} aria-hidden="true">{initial}</span>;
}

export default function AccountMenu({ onOpenOrders, onOpenAddresses, className = '', loginLabelClassName = 'hidden lg:inline' }: AccountMenuProps) {
  const { user, isAuthenticated, isLoading, isAvailable, logout, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Cierra con clic/toque fuera y con Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // Si se cierra la sesión (aquí o desde otra pestaña) el menú no se queda abierto
  useEffect(() => {
    if (!isAuthenticated) setOpen(false);
  }, [isAuthenticated]);

  if (!isAvailable) return null;

  if (isLoading) {
    return <div className={`h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 ${className}`} aria-hidden="true" data-testid="account-loading" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal()}
        aria-label="Iniciar Sesión"
        className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FE6712] px-2.5 text-[11px] font-black text-white shadow-sm transition hover:bg-[#e0580d] active:scale-95 cursor-pointer md:text-xs ${className}`}
      >
        <UserIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {/* Sin espacio para el texto solo se ve el icono (el logo va centrado en la misma fila); el nombre accesible es siempre "Iniciar Sesión" (aria-label) */}
        <span className={`${loginLabelClassName} pr-1`}>Iniciar Sesión</span>
      </button>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      close(false);
    } catch {
      /* no se pudo cerrar la sesión (sin red): el menú sigue abierto para reintentar */
    } finally {
      setLoggingOut(false);
    }
  };

  const itemClass = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de la cuenta de ${user.name}`}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-1.5 shadow-sm transition hover:border-[#fe6712]/50 cursor-pointer lg:pr-3"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden max-w-[110px] truncate text-xs font-black text-slate-800 lg:inline">{firstName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" aria-label="Cuenta" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 pb-3 pt-2">
            <Avatar user={user} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{user.name}</p>
              {user.email && <p className="truncate text-[11px] font-medium text-slate-500">{user.email}</p>}
            </div>
          </div>
          <div className="pt-1.5">
            <button type="button" role="menuitem" onClick={() => { close(false); onOpenOrders(); }} className={itemClass}>
              <ClipboardList className="h-4 w-4 text-[#fe6712]" aria-hidden="true" /> Mis Pedidos
            </button>
            <button type="button" role="menuitem" onClick={() => { close(false); onOpenAddresses(); }} className={itemClass}>
              <MapPin className="h-4 w-4 text-[#fe6712]" aria-hidden="true" /> Direcciones Guardadas
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button type="button" role="menuitem" onClick={handleLogout} disabled={loggingOut} className={`${itemClass} text-red-600 hover:bg-red-50`}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> {loggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
