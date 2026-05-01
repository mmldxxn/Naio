'use client';
import { useEffect, useRef, useState } from 'react';
import { Echo } from '@/types';

declare global {
  interface Window {
    AFRAME?: unknown;
  }
}

interface Props {
  echoes: Echo[];
  userLat: number;
  userLng: number;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildARScene(echoes: Echo[]): string {
  const entities = echoes
    .slice(0, 20)
    .map(
      (e) => `
      <a-entity gps-entity-place="latitude: ${e.lat}; longitude: ${e.lng}" look-at="[gps-camera]">
        <a-box color="#7c3aed" scale="4 4 4" opacity="0.85"></a-box>
        <a-text value="${escapeAttr(e.text?.slice(0, 80) ?? '📍')}"
          color="white" align="center" baseline="bottom"
          position="0 3 0" scale="12 12 12" wrap-count="20"></a-text>
        <a-text value="${escapeAttr(e.creatorName)}"
          color="#c4b5fd" align="center" baseline="top"
          position="0 -3 0" scale="8 8 8" wrap-count="20"></a-text>
      </a-entity>`
    )
    .join('\n');

  return `
    <a-scene
      vr-mode-ui="enabled: false"
      arjs="sourceType: webcam; videoTexture: true; debugUIEnabled: false; trackingMethod: best"
      renderer="logarithmicDepthBuffer: true; precision: medium; antialias: true"
      embedded
      style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;"
    >
      <a-camera gps-camera rotation-reader></a-camera>
      ${entities}
    </a-scene>`;
}

async function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function ARViewer({ echoes, userLat, userLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let stopped = false;

    async function init() {
      try {
        await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
        await loadScript('https://raw.githack.com/AR-js-org/AR.js/3.4.5/aframe/build/aframe-ar.js');
        if (stopped || !containerRef.current) return;
        containerRef.current.innerHTML = buildARScene(echoes);
        setStatus('ready');
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : 'Failed to load AR.');
        setStatus('error');
      }
    }

    init();

    return () => {
      stopped = true;
      // Stop camera tracks on unmount
      document.querySelectorAll('video').forEach((v) => {
        (v.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      });
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [echoes, userLat, userLng]);

  return (
    <div className="relative h-full w-full">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading AR engine…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black px-8 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-white font-semibold mb-1">AR unavailable</p>
          <p className="text-sm text-gray-400">{errMsg || 'Camera permission required. Make sure you are on HTTPS.'}</p>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
