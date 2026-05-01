'use client';
import { useEffect, useRef } from 'react';
import { Echo } from '@/types';
import { haversine } from '@/lib/haversine';
import { showLocalNotification } from '@/lib/notifications';
import { GEOFENCE_RADIUS_M } from '@/lib/echoes';

export function useGeofencing(
  lat: number | null,
  lng: number | null,
  echoes: Echo[]
) {
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (lat === null || lng === null) return;

    echoes.forEach((echo) => {
      if (notifiedIds.current.has(echo.id)) return;
      const dist = haversine(lat, lng, echo.lat, echo.lng);
      if (dist <= GEOFENCE_RADIUS_M) {
        notifiedIds.current.add(echo.id);
        showLocalNotification(
          'Echo nearby!',
          `"${echo.text?.slice(0, 60) ?? 'Photo echo'}" by ${echo.creatorName}`,
          echo.id
        );
      }
    });
  }, [lat, lng, echoes]);
}
