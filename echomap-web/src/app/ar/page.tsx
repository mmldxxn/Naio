'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyEchoes } from '@/hooks/useNearbyEchoes';

const ARViewer = dynamic(() => import('@/components/ARViewer').then((m) => m.ARViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>
  ),
});

export default function ARPage() {
  return (
    <AuthGuard>
      <ARInner />
    </AuthGuard>
  );
}

function ARInner() {
  const { user } = useAuth();
  const { position, error } = useGeolocation();
  const echoes = useNearbyEchoes(position, user?.uid ?? null);

  if (error || !position) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black px-8 text-center">
        <p className="mb-3 text-5xl">🗺️</p>
        <p className="text-lg font-semibold text-white mb-2">Location required</p>
        <p className="text-sm text-gray-400">
          {error ?? 'Waiting for GPS signal to position AR echoes…'}
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <ARViewer echoes={echoes} userLat={position.lat} userLng={position.lng} />

      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
            📍 AR Mode
          </div>
          <div className="rounded-full bg-black/50 px-3 py-1 text-xs text-purple-300 backdrop-blur">
            {echoes.length} echo{echoes.length !== 1 ? 's' : ''} in range
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
