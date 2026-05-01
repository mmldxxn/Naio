'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Echo } from '@/types';
import { haversine } from '@/lib/haversine';

// Fix Leaflet's default icon path issue with webpack
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

if (typeof window !== 'undefined') fixLeafletIcons();

const echoIcon = L.divIcon({
  className: '',
  html: `<div class="echo-pin"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#7c3aed" width="36" height="36"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.222-4.528 3.222-7.327a7.5 7.5 0 10-15 0c0 2.799 1.278 5.248 3.222 7.327a19.585 19.585 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const lockedIcon = L.divIcon({
  className: '',
  html: `<div class="echo-pin" style="filter:drop-shadow(0 2px 6px rgba(107,114,128,0.6))"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6b7280" width="32" height="32"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const userIcon = L.divIcon({
  className: '',
  html: '<div class="user-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      map.flyTo([lat, lng], 17, { duration: 1.2 });
      moved.current = true;
    }
  }, [lat, lng, map]);
  return null;
}

// Flies to a search result; key changes trigger re-flight to same coords
function FlyToTarget({ target }: { target: { lat: number; lng: number; key: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([target.lat, target.lng], 17, { duration: 1.4 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.key]);
  return null;
}

export interface FlyTarget {
  lat: number;
  lng: number;
  key: number;
}

interface MapViewProps {
  lat: number | null;
  lng: number | null;
  echoes: Echo[];
  onEchoClick: (echo: Echo) => void;
  flyTarget?: FlyTarget | null;
}

export default function MapView({ lat, lng, echoes, onEchoClick, flyTarget }: MapViewProps) {
  const defaultCenter: [number, number] = [37.7749, -122.4194];

  return (
    <MapContainer
      center={lat && lng ? [lat, lng] : defaultCenter}
      zoom={16}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {lat && lng && (
        <>
          <Marker position={[lat, lng]} icon={userIcon} />
          <FlyToUser lat={lat} lng={lng} />
        </>
      )}

      {flyTarget && <FlyToTarget target={flyTarget} />}

      {echoes.map((echo) => {
        const isLocked = echo.visibleAfter && echo.visibleAfter > new Date();
        const isNearby = lat && lng ? haversine(lat, lng, echo.lat, echo.lng) <= 150 : false;
        return (
          <Marker
            key={echo.id}
            position={[echo.lat, echo.lng]}
            icon={isLocked ? lockedIcon : echoIcon}
            eventHandlers={{
              click: () => { if (!isLocked) onEchoClick(echo); },
            }}
            opacity={isNearby ? 1 : 0.7}
          />
        );
      })}
    </MapContainer>
  );
}
