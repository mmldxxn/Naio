'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (installed || dismissed) return null;

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      else setDismissed(true);
    }
  }

  const hint = isIOS()
    ? 'Tap the Share button, then "Add to Home Screen"'
    : deferredPrompt
    ? null
    : 'Open browser menu → "Install app" or "Add to Home Screen"';

  return (
    <div style={{ position: 'fixed', top: 100, left: 16, right: 16, zIndex: 9998 }}
      className="flex items-center gap-3 rounded-2xl border border-purple-500/30 bg-[#1a0a2e]/95 px-4 py-3 shadow-xl backdrop-blur">
      <span className="text-xl">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Install EchoMap</p>
        <p className="text-xs text-gray-400 truncate">{hint ?? 'Add to home screen for the best experience'}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-gray-500 hover:text-white px-1"
      >
        ✕
      </button>
      {deferredPrompt && (
        <button
          onClick={install}
          className="flex-shrink-0 rounded-xl bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Install
        </button>
      )}
    </div>
  );
}
