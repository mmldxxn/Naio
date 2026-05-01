'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { EchoDetailModal } from '@/components/EchoDetailModal';
import { EditEchoModal } from '@/components/EditEchoModal';
import { Portal } from '@/components/Portal';
import { useAuth } from '@/hooks/useAuth';
import { subscribeMyEchoes, deleteEcho } from '@/lib/echoes';
import { Echo } from '@/types';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileInner />
    </AuthGuard>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function privacyBadge(p: Echo['privacy']) {
  if (p === 'public') return <span className="rounded-full bg-green-900/40 px-1.5 py-0.5 text-xs text-green-400">🌍</span>;
  if (p === 'friends') return <span className="rounded-full bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-400">👥</span>;
  return <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">🔒</span>;
}

function ProfileInner() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [selected, setSelected] = useState<Echo | null>(null);
  const [editing, setEditing] = useState<Echo | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyEchoes(user.uid, setEchoes);
    return unsub;
  }, [user?.uid]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteEcho(id);
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col bg-[var(--bg)]" style={{ minHeight: '100dvh', paddingBottom: 64 }}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[var(--border)] px-5 pt-12 pb-5">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt={user.displayName ?? ''} className="h-16 w-16 rounded-full object-cover ring-2 ring-purple-500" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white ring-2 ring-purple-500">
            {(user.displayName ?? 'E')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{user.displayName ?? 'Explorer'}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="mt-0.5 text-xs text-purple-400">{echoes.length} echo{echoes.length !== 1 ? 's' : ''} dropped</p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-gray-400 hover:border-red-500/40 hover:text-red-400"
        >
          Sign out
        </button>
      </div>

      {/* Echoes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {echoes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="mb-2 text-4xl">📍</p>
            <p className="text-sm text-gray-400">You haven&apos;t dropped any echoes yet.</p>
            <p className="text-xs text-gray-600">Go to the Map tab and tap Drop Echo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {echoes.map((echo) => (
              <div
                key={echo.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-purple-500/20"
              >
                {/* Thumbnail — opens detail */}
                <button onClick={() => setSelected(echo)} className="flex-shrink-0">
                  {echo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={echo.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-purple-900/30">
                      <span className="text-2xl">📍</span>
                    </div>
                  )}
                </button>

                {/* Content — opens detail */}
                <button onClick={() => setSelected(echo)} className="min-w-0 flex-1 text-left">
                  <p className="line-clamp-2 text-sm text-gray-200">{echo.text ?? '📷 Photo echo'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(echo.createdAt)}</span>
                    {privacyBadge(echo.privacy)}
                    {echo.visibleAfter && echo.visibleAfter > new Date() && (
                      <span className="rounded-full bg-amber-900/30 px-1.5 py-0.5 text-xs text-amber-400">⏳</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600">{echo.viewCount} views</p>
                </button>

                {/* Edit / Delete action buttons */}
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => setEditing(echo)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(echo.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <Portal>
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6" style={{ zIndex: 99999 }}>
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6">
              <p className="mb-1 text-base font-semibold text-white">Delete this echo?</p>
              <p className="mb-5 text-sm text-gray-400">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm text-gray-300 hover:border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit modal */}
      {editing && (
        <Portal>
          <EditEchoModal
            echo={editing}
            onClose={() => setEditing(null)}
            onSaved={() => setEditing(null)}
          />
        </Portal>
      )}

      {/* Detail modal */}
      {selected && (
        <Portal>
          <EchoDetailModal
            echo={selected}
            currentUid={user.uid}
            onClose={() => setSelected(null)}
            onDeleted={() => setSelected(null)}
          />
        </Portal>
      )}
    </div>
  );
}
