import Link from 'next/link';

// 404 de `/store/...`: el comercio o el producto del enlace no existe. Lleva de vuelta al marketplace en vez de dejar una pantalla vacía.
export default function StoreNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-lg p-8 text-center space-y-4">
        <p className="text-5xl font-black text-[#fe6712] leading-none">404</p>
        <h1 className="text-lg font-black text-slate-900">No encontramos este comercio o producto</h1>
        <p className="text-sm text-slate-500 font-medium">
          Puede que el enlace esté incompleto o que el comercio ya no esté disponible. Explora los comercios de D&apos;una Marketplace.
        </p>
        <Link
          href="/"
          className="inline-block w-full bg-[#fe6712] hover:bg-[#e0580d] text-white text-sm font-black py-3 rounded-full shadow-md transition"
        >
          Ir al marketplace
        </Link>
      </div>
    </main>
  );
}
