'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { DropEchoModal } from '@/components/DropEchoModal';
import { EchoDetailModal } from '@/components/EchoDetailModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Portal } from '@/components/Portal';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyEchoes } from '@/hooks/useNearbyEchoes';
import { useGeofencing } from '@/hooks/useGeofencing';
import { incrementView } from '@/lib/echoes';
import { setupPushNotifications } from '@/lib/notifications';
import { Echo } from '@/types';
import { FlyTarget } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0 }} className="animate-pulse bg-gray-900" />,
});

export default function MapPage() {
  return (
    <AuthGuard>
      <MapInner />
    </AuthGuard>
  );
}

function MapInner() {
  const { user } = useAuth();
  const { position, error: geoError } = useGeolocation();
  const echoes = useNearbyEchoes(position, user?.uid ?? null);
  const [dropping, setDropping] = useState(false);
  const [selected, setSelected] = useState<Echo | null>(null);
  const [notifAsked, setNotifAsked] = useState(false);
  const [locationToast, setLocationToast] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

  useGeofencing(position?.lat ?? null, position?.lng ?? null, echoes);

  useEffect(() => {
    if (!notifAsked && user && 'Notification' in window && Notification.permission === 'default') {
      setNotifAsked(true);
      setupPushNotifications(user.uid);
    }
  }, [user, notifAsked]);

  function handleEchoClick(echo: Echo) {
    setSelected(echo);
    incrementView(echo.id).catch(() => {});
  }

  function handleDropPress() {
    if (!position) {
      setLocationToast(true);
      setTimeout(() => setLocationToast(false), 3000);
      return;
    }
    setDropping(true);
  }

  // NAV_H must match BottomNav height (py-3 * 2 + icon + label ≈ 64px)
  const NAV_H = 64;

  return (
    <>
      {/* Map: fixed to viewport, sits below nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: NAV_H, zIndex: 0 }}>
        <MapView
          lat={position?.lat ?? null}
          lng={position?.lng ?? null}
          echoes={echoes}
          onEchoClick={handleEchoClick}
          flyTarget={flyTarget}
        />
      </div>

      {/* All floating UI rendered via Portal so no parent stacking context can clip them */}
      <Portal>
        {/* Search bar */}
        <div style={{ position: 'fixed', top: 16, left: 16, right: 16, zIndex: 9999 }}>
          <SearchBar
            onSelect={(r) => setFlyTarget({ lat: r.lat, lng: r.lng, key: Date.now() })}
          />
        </div>

        {/* Echo count chip — below search bar */}
        <div
          style={{ position: 'fixed', top: 72, left: 16, zIndex: 9999, pointerEvents: 'none' }}
          className="rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur"
        >
          {echoes.length} echo{echoes.length !== 1 ? 's' : ''} nearby
        </div>

        {/* Geo error */}
        {geoError && (
          <div style={{ position: 'fixed', top: 72, left: 16, right: 16, zIndex: 9999 }}
            className="rounded-xl bg-red-900/80 px-4 py-2 text-xs text-red-200">
            📍 {geoError}
          </div>
        )}

        {/* Location toast */}
        {locationToast && (
          <div style={{ position: 'fixed', top: 72, left: 16, right: 16, zIndex: 9999 }}
            className="rounded-xl bg-amber-900/80 px-4 py-2 text-xs text-amber-200">
            📍 Waiting for your location… allow location access and try again.
          </div>
        )}

        {/* Re-center */}
        {position && (
          <button
            style={{ position: 'fixed', bottom: NAV_H + 80, right: 16, zIndex: 9999 }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] shadow-lg border border-[var(--border)]"
            onClick={() => {}}
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>
        )}

        {/* Drop Echo FAB */}
        <button
          style={{ position: 'fixed', bottom: NAV_H + 12, right: 16, zIndex: 9999 }}
          onClick={handleDropPress}
          className="flex items-center gap-2 rounded-full bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/50 hover:bg-purple-500 active:scale-95 transition-transform"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Drop Echo
        </button>

        <InstallPrompt />
      </Portal>

      {/* Nav always on top */}
      <BottomNav />

      {/* Modals — portalled so they always sit above BottomNav */}
      {dropping && position && user && (
        <Portal>
          <DropEchoModal
            lat={position.lat}
            lng={position.lng}
            uid={user.uid}
            displayName={user.displayName ?? 'Explorer'}
            photoUrl={user.photoURL ?? undefined}
            onClose={() => setDropping(false)}
            onDropped={() => setDropping(false)}
          />
        </Portal>
      )}

      {selected && (
        <Portal>
          <EchoDetailModal
            echo={selected}
            userLat={position?.lat}
            userLng={position?.lng}
            currentUid={user?.uid}
            onClose={() => setSelected(null)}
            onDeleted={() => setSelected(null)}
          />
        </Portal>
      )}
    </>
  );
}
