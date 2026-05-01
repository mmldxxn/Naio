'use client';
import { useState } from 'react';
import { Echo } from '@/types';
import { haversine } from '@/lib/haversine';
import { deleteEcho } from '@/lib/echoes';
import { EditEchoModal } from './EditEchoModal';

interface Props {
  echo: Echo;
  userLat?: number;
  userLng?: number;
  currentUid?: string;
  onClose: () => void;
  onDeleted?: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m away` : `${(m / 1000).toFixed(1)}km away`;
}

export function EchoDetailModal({ echo, userLat, userLng, currentUid, onClose, onDeleted }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const dist = userLat != null && userLng != null
    ? haversine(userLat, userLng, echo.lat, echo.lng)
    : null;

  const isOwner = !!currentUid && currentUid === echo.creatorId;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEcho(echo.id);
      onDeleted?.();
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (editing) {
    return (
      <EditEchoModal
        echo={echo}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); onClose(); }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-[var(--surface)] pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-2">
          {/* Creator row */}
          <div className="mb-3 flex items-center gap-3">
            {echo.creatorPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={echo.creatorPhotoUrl} alt={echo.creatorName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                {echo.creatorName[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{echo.creatorName}</p>
              <p className="text-xs text-gray-500">{formatDate(echo.createdAt)}</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              {dist !== null && <span className="text-xs text-purple-400">{formatDist(dist)}</span>}
              <span className="text-xs text-gray-500">{echo.viewCount} views</span>
            </div>
          </div>

          {/* Image */}
          {echo.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={echo.imageUrl} alt="echo" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
          )}

          {/* Text */}
          {echo.text && (
            <p className="mb-3 whitespace-pre-wrap text-base text-gray-200 leading-relaxed">{echo.text}</p>
          )}

          {/* Privacy badge */}
          <div className="mb-4 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              echo.privacy === 'public' ? 'bg-green-900/40 text-green-400' :
              echo.privacy === 'friends' ? 'bg-blue-900/40 text-blue-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              {echo.privacy === 'public' ? '🌍 Public' : echo.privacy === 'friends' ? '👥 Friends' : '🔒 Private'}
            </span>
            {echo.visibleAfter && (
              <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400">⏳ Capsule</span>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && !confirmDelete && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] py-2.5 text-sm text-gray-300 hover:border-purple-500/50 hover:text-purple-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] py-2.5 text-sm text-gray-300 hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          )}

          {/* Delete confirmation */}
          {isOwner && confirmDelete && (
            <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4">
              <p className="mb-3 text-sm text-red-300">Delete this echo permanently? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-[var(--border)] py-2 text-sm text-gray-300 hover:border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
