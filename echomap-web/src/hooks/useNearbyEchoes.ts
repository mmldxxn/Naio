'use client';
import { useEffect, useState } from 'react';
import { Echo } from '@/types';
import { subscribeNearbyEchoes } from '@/lib/echoes';
import { GeoPosition } from './useGeolocation';

export function useNearbyEchoes(position: GeoPosition | null, uid: string | null) {
  const [echoes, setEchoes] = useState<Echo[]>([]);

  useEffect(() => {
    if (!position) return;
    const unsub = subscribeNearbyEchoes(position.lat, position.lng, uid, setEchoes);
    return unsub;
  }, [position?.lat, position?.lng, uid]);

  return echoes;
}
