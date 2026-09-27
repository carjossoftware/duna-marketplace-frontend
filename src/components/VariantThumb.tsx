'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Miniatura de una variante (sabor / presentación) con visor emergente (lightbox) al tocarla. Se usa dentro de `OptionCapsule`
// (MasterProductModal). Solo presentación: NO toca la selección, los contadores, el carrito ni ningún precio.
//
// Reglas de diseño:
//  · La cápsula que la contiene ya es un `<button>` (y en modo contador también su zona izquierda), y un botón dentro de otro es HTML
//    inválido: el disparador es un `<span role="button" tabIndex=0>` con teclado (Enter / Espacio).
//  · Aislamiento de eventos: el clic en la miniatura hace `stopPropagation` (no selecciona la variante ni suma). Además el visor se
//    dibuja en un portal, pero los eventos de React de un portal SIGUEN subiendo por el árbol de React hasta la cápsula: por eso todo
//    el visor detiene la propagación (cerrarlo con el fondo o con la X no debe seleccionar la variante).
//  · El visor va a `document.body` con `z-[200]`: el modal de producto es `z-[100]` y tiene ancestros con transformaciones que atraparían
//    un `fixed` normal (no cubriría la pantalla).
//  · Sin imagen (o si la imagen falla al cargar) no hay cursor de zoom ni visor.

interface VariantThumbProps {
  image?: string | null;
  name: string;
  priceLabel: string | null; // etiqueta de la cápsula ("+$0.78" / "$4.40"); null = incluido en el precio
  bsLabel: string | null;
}

const THUMB_CLASSES = 'w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5';

function Lightbox({ image, name, priceLabel, bsLabel, onClose }: { image: string; name: string; priceLabel: string | null; bsLabel: string | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    // Bloqueo del scroll del fondo. El modal de producto ya pone `overflow: hidden` en el body y lo repone al cerrarse; si ya estaba
    // bloqueado no se toca (restaurar "el valor anterior" = hidden después de que el modal lo repuso dejaría la página bloqueada).
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const lockedByUs = previousOverflow !== 'hidden';
    if (lockedByUs) body.style.overflow = 'hidden';

    // Escape cierra SOLO el visor: fase de captura + stopPropagation para que ningún otro listener (p. ej. un modal padre) lo reciba
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    closeRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (lockedByUs) body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Cualquier evento del visor se queda en el visor (ver nota de propagación arriba)
  const contain = (e: React.SyntheticEvent) => e.stopPropagation();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${name}`}
      data-testid="variant-lightbox"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      onKeyDown={contain}
      onKeyUp={contain}
      onMouseDown={contain}
      onTouchStart={contain}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain cursor-zoom-out"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Cerrar visor"
        className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full text-white hover:text-[#FE6712] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE6712] cursor-pointer"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Clic sobre la foto o la etiqueta NO cierra: solo el fondo exterior */}
      <figure className="flex max-w-full flex-col items-center gap-3 cursor-default" onClick={contain}>
        {/* Marco cuadrado estandarizado (1:1, hasta 512 × 512 px): la foto se ajusta con `object-contain` (sin recorte ni deformación, sea alta o ancha).
            El ancho es min(512px, 85vw, 70vh) y `aspect-square` fija el alto: así el marco sigue siendo cuadrado también en móvil apaisado, donde
            un `max-h` suelto lo aplastaría a un rectángulo. */}
        <div className="flex aspect-square w-[min(512px,85vw,70vh)] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-4 shadow-2xl">
          {imageFailed ? (
            <p className="px-6 text-center text-sm font-bold text-white">No pudimos cargar la foto de esta opción.</p>
          ) : (
            <img
              src={image}
              alt={name}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <figcaption className="flex max-w-[85vw] items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-lg">
          <span className="truncate text-sm font-black text-slate-900">{name}</span>
          {priceLabel ? (
            <span className="shrink-0 text-right leading-tight">
              <span className="block text-sm font-black text-[#fe6712]">{priceLabel}</span>
              {bsLabel && <span className="block text-[10px] font-bold text-slate-500">{bsLabel}</span>}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] font-black text-emerald-600">Incluido</span>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}

export default function VariantThumb({ image, name, priceLabel, bsLabel }: VariantThumbProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false); // la miniatura no cargó: no hay nada que ampliar
  const thumbRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    thumbRef.current?.focus(); // el foco vuelve a la miniatura (teclado / lectores de pantalla)
  }, []);

  if (!image) return null;

  if (broken) {
    return <img src={image} alt={name} className={`${THUMB_CLASSES} shrink-0`} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />;
  }

  const openViewer = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation(); // no seleccionar la variante ni sumar al contador
    setOpen(true);
  };

  return (
    <>
      <span
        ref={thumbRef}
        role="button"
        tabIndex={0}
        aria-label={`Ver foto de ${name}`}
        data-testid="variant-thumb"
        onClick={openViewer}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openViewer(e); }}
        className="shrink-0 rounded-lg cursor-zoom-in transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE6712]"
      >
        <img src={image} alt={name} onError={() => setBroken(true)} className={THUMB_CLASSES} />
      </span>
      {open && <Lightbox image={image} name={name} priceLabel={priceLabel} bsLabel={bsLabel} onClose={close} />}
    </>
  );
}
