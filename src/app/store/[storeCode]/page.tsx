import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MultitiendaHub from '@/components/MarketplaceHub';
import { getRequestOrigin, resolveStoreByCode, safeDecode } from '@/lib/serverStore';
import { buildStoreMetadata, NOT_FOUND_METADATA } from '@/lib/seo';

// `/store/{storeCode}` — catálogo completo del comercio con su URL amistosa (p. ej. `/store/papa-helado`). El servidor valida el código
// contra `GET /store/find` (404 real si no existe) y arma los metadatos Open Graph; la tienda se abre en el cliente con el mismo flujo del
// Home (`MarketplaceHub`), así que carrito, checkout y seguimiento son exactamente los de siempre.
interface StorePageProps {
  params: { storeCode: string };
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { store, reachable } = await resolveStoreByCode(safeDecode(params.storeCode));
  if (store) return buildStoreMetadata(store, getRequestOrigin());
  // Sin respuesta del backend no se afirma que el comercio no exista: metadatos genéricos del sitio
  return reachable ? NOT_FOUND_METADATA : {};
}

export default async function StorePage({ params }: StorePageProps) {
  const storeCode = safeDecode(params.storeCode);
  const { store, reachable } = await resolveStoreByCode(storeCode);
  if (reachable && !store) notFound();
  // Con el backend caído (`store: null`) la página se sirve igual: el cliente busca la tienda por su código al cargar el listado
  return <MultitiendaHub initialStoreCode={storeCode} initialStore={store ?? undefined} />;
}
