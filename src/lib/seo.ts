// Metadatos Open Graph / Twitter para las rutas por tienda. Funciones puras (sin red ni `next/headers`): reciben la tienda/producto ya
// resueltos y el origen de la petición. Todo dato sale del backend (nombre, categorías, banner/avatar, imagen y precio del producto);
// no se inventa nada. WhatsApp/Facebook leen estas etiquetas del HTML inicial, sin ejecutar JavaScript.
import type { Metadata } from 'next';
import { parseDescriptionTags } from '@/lib/productTags';

export const SITE_NAME = "D'una Marketplace";

// Los rastreadores muestran ~200 caracteres; se recorta en un límite de palabra
function clip(text: string, max = 200): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// URL absoluta: las imágenes del backend ya vienen con https; una ruta relativa se completa con el origen de la petición
function absoluteUrl(url: unknown, origin: string): string | null {
  const u = String(url || '').trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `${origin}${u.startsWith('/') ? '' : '/'}${u}`;
}

// El precio real puede venir en `price` o, en productos con variantes, en `metadata.price.basePrice`
export function productPriceUSD(product: any): number | null {
  const direct = Number(product?.price);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const base = Number(product?.metadata?.price?.basePrice);
  return Number.isFinite(base) && base > 0 ? base : null;
}

function social(title: string, description: string, url: string, image: string | null, imageAlt: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'es_VE',
      title,
      description,
      url,
      ...(image ? { images: [{ url: image, alt: imageAlt }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function buildStoreMetadata(store: any, origin: string): Metadata {
  const name = String(store?.name || 'Comercio').trim();
  const categories = String(store?.categoriesName || '').split(/[,/|;]+/).map((s) => s.trim()).filter(Boolean);
  const title = `${name} | ${SITE_NAME}`;
  const description = clip(
    `Haz tu pedido en línea en ${name}${categories.length ? ` (${Array.from(new Set(categories)).join(', ')})` : ''}. Delivery o retiro en tienda con ${SITE_NAME}.`
  );
  const url = `${origin}/store/${encodeURIComponent(String(store?.code || ''))}`;
  const image = absoluteUrl(store?.banner, origin) || absoluteUrl(store?.avatar, origin);
  return { title, description, alternates: { canonical: url }, ...social(title, description, url, image, name) };
}

export function buildProductMetadata(store: any | null, product: any, productId: string, origin: string): Metadata {
  const productName = String(product?.name || 'Producto').trim();
  const storeName = String(store?.name || product?.storeName || 'Comercio').trim();
  const storeCode = String(store?.code || product?.storeCode || '');
  const price = productPriceUSD(product);
  // Los metadatos ocultos `[CLAVE: valor]` de la descripción (ver productTags.ts) no se muestran en la vista previa
  const cleanDescription = parseDescriptionTags(String(product?.description || product?.desc || '')).cleanDescription;
  const title = `${productName} - ${storeName} | ${SITE_NAME}`;
  const description = clip(
    [cleanDescription, price !== null ? `Precio: $${price.toFixed(2)}.` : '', `Pídelo en ${storeName} con ${SITE_NAME}.`].filter(Boolean).join(' ')
  );
  const url = `${origin}/store/${encodeURIComponent(storeCode)}/product/${encodeURIComponent(productId)}`;
  const image = absoluteUrl(product?.image, origin) || absoluteUrl(store?.banner, origin) || absoluteUrl(store?.avatar, origin);
  return { title, description, alternates: { canonical: url }, ...social(title, description, url, image, productName) };
}

// Ruta cuyo comercio/producto no existe: sin indexar
export const NOT_FOUND_METADATA: Metadata = {
  title: `No encontramos lo que buscas | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};
