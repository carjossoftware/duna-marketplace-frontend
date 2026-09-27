import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import MultitiendaHub from '@/components/MarketplaceHub';
import { getRequestOrigin, resolveProduct, resolveStoreByCode, safeDecode } from '@/lib/serverStore';
import { buildProductMetadata, NOT_FOUND_METADATA } from '@/lib/seo';

// `/store/{storeCode}/product/{productId}` — ficha compartida del producto (antes daba 404: el botón de compartir armaba este enlace y
// la ruta no existía). Abre la tienda con esa ficha ya desplegada; `productId` es el id numérico o el hash, como acepta el backend.
// Los metadatos Open Graph llevan nombre, imagen y precio REALES del producto para la vista previa en WhatsApp/redes.
interface ProductPageProps {
  params: { storeCode: string; productId: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const storeCode = safeDecode(params.storeCode);
  const productId = safeDecode(params.productId);
  const [{ store }, lookup] = await Promise.all([resolveStoreByCode(storeCode), resolveProduct(productId)]);
  if (lookup.state === 'ok') return buildProductMetadata(store, lookup.product, productId, getRequestOrigin());
  return lookup.state === 'not_found' ? NOT_FOUND_METADATA : {};
}

export default async function ProductPage({ params }: ProductPageProps) {
  const storeCode = safeDecode(params.storeCode);
  const productId = safeDecode(params.productId);
  const [{ store, reachable }, lookup] = await Promise.all([resolveStoreByCode(storeCode), resolveProduct(productId)]);

  if (reachable && !store) notFound(); // el comercio no existe
  if (lookup.state === 'not_found') notFound(); // el producto no existe

  // El producto existe pero pertenece a OTRO comercio (enlace armado con un código equivocado): se lleva al URL correcto en vez de
  // abrir una tienda con un producto ajeno
  if (lookup.state === 'ok') {
    const ownerCode = String(lookup.product?.storeCode || '').trim();
    if (ownerCode && ownerCode.toLowerCase() !== storeCode.trim().toLowerCase()) {
      redirect(`/store/${encodeURIComponent(ownerCode)}/product/${encodeURIComponent(productId)}`);
    }
  }

  return <MultitiendaHub initialStoreCode={storeCode} initialStore={store ?? undefined} initialProductId={productId} />;
}
