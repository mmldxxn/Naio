'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Provider = 'google' | 'apple' | 'meta' | 'tiktok';

const providers: { id: Provider; label: string; bg: string; logo: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    bg: 'bg-white text-gray-900 hover:bg-gray-100',
    logo: (
      <svg className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    bg: 'bg-white text-gray-900 hover:bg-gray-100',
    logo: (
      <svg className="h-5 w-5" viewBox="0 0 814 1000" fill="currentColor">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 439 0 228.8 0 172.7c0-100.4 55.4-148.4 109.5-148.4 60.1 0 94.7 39.9 149.8 39.9 52.6 0 94.7-40.8 158.2-40.8 53.4 0 113.5 31 162 83.8z"/>
      </svg>
    ),
  },
  {
    id: 'meta',
    label: 'Continue with Meta',
    bg: 'bg-[#1877F2] text-white hover:bg-[#166fe5]',
    logo: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'tiktok',
    label: 'Continue with TikTok',
    bg: 'bg-[#010101] text-white hover:bg-[#1a1a1a] border border-white/10',
    logo: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
      </svg>
    ),
  },
];

export default function LoginPage() {
  const { signInWithGoogle, signInWithApple, signInWithMeta } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  async function handleSignIn(id: Provider) {
    if (id === 'tiktok') {
      setError('TikTok login is coming soon.');
      return;
    }
    setLoading(id);
    setError('');
    try {
      if (id === 'google') await signInWithGoogle();
      else if (id === 'apple') await signInWithApple();
      else if (id === 'meta') await signInWithMeta();
      router.replace('/map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--bg)] px-8">
      {/* Logo */}
      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-600/20 border border-purple-500/30">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a855f7" className="h-12 w-12">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.222-4.528 3.222-7.327a7.5 7.5 0 10-15 0c0 2.799 1.278 5.248 3.222 7.327a19.585 19.585 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
        </svg>
      </div>

      <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">EchoMap</h1>
      <p className="mb-10 text-center text-gray-400">
        Leave memories at places.<br />Discover them in AR.
      </p>

      <div className="w-full max-w-xs space-y-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSignIn(p.id)}
            disabled={loading !== null}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-opacity disabled:opacity-60 ${p.bg}`}
          >
            {loading === p.id ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              p.logo
            )}
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <p className="mt-10 text-center text-xs text-gray-600">
        By continuing you agree to our Terms & Privacy Policy.
      </p>
    </div>
  );
}
