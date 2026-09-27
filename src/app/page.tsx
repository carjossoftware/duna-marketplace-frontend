import MultitiendaHub from '@/components/MarketplaceHub';

// Home del marketplace. El componente vive en `src/components/MarketplaceHub.tsx` para que las rutas por tienda
// (`/store/[storeCode]` y `/store/[storeCode]/product/[productId]`) lo reutilicen: una página de Next solo puede recibir
// `params`/`searchParams`, no props propias.
export default function HomePage() {
  return <MultitiendaHub />;
}
