// Lecturas del backend desde el SERVIDOR para las rutas por tienda (`/store/[storeCode]` y `/store/[storeCode]/product/[productId]`):
// validar que la tienda/producto existe (404 real en vez de una página rota) y armar los metadatos Open Graph (vista previa en
// WhatsApp/redes, que NO ejecutan JavaScript). Solo se importa desde componentes de servidor (`page.tsx` / `generateMetadata`).
import { headers } from 'next/headers';
import { findStores, getProduct } from '@/services/marketplaceService';

// Caché de datos de Next: el listado de tiendas y la ficha de un producto se reutilizan 60 s entre peticiones (los rastreadores de vista
// previa y los clientes que abren el mismo enlace no golpean el backend cada vez). El horario/estado cambia con el tiempo, por eso los
// metadatos NO incluyen horarios.
const REVALIDATE_SECONDS = 60;
// Timeout corto: un rastreador (WhatsApp, Facebook) abandona la petición si tarda; con el backend lento se sirve la página sin metadatos
// específicos en vez de bloquearla
const SERVER_TIMEOUT_MS = 6000;

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// `reachable: false` = el backend no respondió (red/timeout/respuesta rara): NO es un 404, la ruta se sirve igual y el cliente resuelve la
// tienda por su cuenta. `reachable: true` con `store: null` = el listado llegó y ese código no existe: 404 real.
export async function resolveStoreByCode(code: string): Promise<{ store: any | null; reachable: boolean }> {
  const res = await findStores({ next: { revalidate: REVALIDATE_SECONDS } }, SERVER_TIMEOUT_MS);
  if (!(res && res.code === 1 && Array.isArray(res.data))) return { store: null, reachable: false };
  const wanted = String(code || '').trim().toLowerCase();
  const store = res.data.find((s: any) => String(s?.code || '').trim().toLowerCase() === wanted) || null;
  return { store, reachable: true };
}

export type ProductLookup =
  | { state: 'ok'; product: any }
  | { state: 'not_found' }
  | { state: 'unreachable' };

// Acepta el id numérico o el hash del producto (como `GET /product/{id}/web`). Un producto inexistente responde HTTP 404 con
// `{ message: "E_ROW_NOT_FOUND..." }` y sin `code`; cualquier otro fallo (red, timeout, HTML) se trata como "sin respuesta".
export async function resolveProduct(idOrHash: string): Promise<ProductLookup> {
  const key = String(idOrHash || '').trim();
  if (!key) return { state: 'not_found' };
  const res = await getProduct(key, { next: { revalidate: REVALIDATE_SECONDS } }, SERVER_TIMEOUT_MS);
  if (res && res.code === 1 && res.data && typeof res.data === 'object') return { state: 'ok', product: res.data };
  if (res && /E_ROW_NOT_FOUND|not found/i.test(String(res.message || ''))) return { state: 'not_found' };
  return { state: 'unreachable' };
}

// Origen público de ESTA petición (para URLs absolutas de og:url / og:image): detrás de un proxy manda `x-forwarded-*`.
export function getRequestOrigin(): string {
  const h = headers();
  const first = (v: string | null) => (v ? v.split(',')[0].trim() : '');
  const host = first(h.get('x-forwarded-host')) || first(h.get('host')) || 'localhost:3000';
  const isLocal = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = first(h.get('x-forwarded-proto')) || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}
