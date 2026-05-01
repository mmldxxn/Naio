'use client';
import { useState, useRef } from 'react';
import { dropEcho } from '@/lib/echoes';
import { Privacy } from '@/types';

function storageErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code;
    if (code === 'storage/unauthorized')
      return 'Upload blocked by Firebase Storage rules. See setup instructions below.';
    if (code === 'storage/canceled') return 'Upload cancelled.';
    if (code === 'storage/unknown') return 'Network error — check your connection.';
  }
  return e instanceof Error ? e.message : 'Failed to drop echo.';
}

interface Props {
  lat: number;
  lng: number;
  uid: string;
  displayName: string;
  photoUrl?: string;
  onClose: () => void;
  onDropped: () => void;
}

const privacyOptions: { value: Privacy; label: string; icon: string; desc: string }[] = [
  { value: 'public', label: 'Public', icon: '🌍', desc: 'Visible to everyone' },
  { value: 'friends', label: 'Friends', icon: '👥', desc: 'Only your circle' },
  { value: 'private', label: 'Private', icon: '🔒', desc: 'Only you' },
];

export function DropEchoModal({ lat, lng, uid, displayName, photoUrl, onClose, onDropped }: Props) {
  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [capsule, setCapsule] = useState(false);
  const [visibleAfter, setVisibleAfter] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError('');
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handlePost() {
    if (!text.trim() && !imageFile) {
      setError('Add a message or photo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (imageFile) setUploadProgress('Uploading photo…');
      await dropEcho({
        creatorId: uid,
        creatorName: displayName,
        creatorPhotoUrl: photoUrl,
        text: text.trim() || undefined,
        imageFile: imageFile ?? undefined,
        lat,
        lng,
        privacy,
        visibleAfter: capsule && visibleAfter ? new Date(visibleAfter) : undefined,
      });
      onDropped();
    } catch (e) {
      setError(storageErrorMessage(e));
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="fixed inset-0 flex items-end justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 99999 }}>
      <div className="w-full max-w-lg rounded-t-2xl bg-[var(--surface)] p-5 pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Drop an Echo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={4}
          placeholder="What's here? Leave a memory…"
          className="w-full resize-none rounded-xl bg-white/5 p-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
        />
        <div className="mb-3 text-right text-xs text-gray-500">{text.length}/280</div>

        {/* Image picker */}
        {preview ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="h-32 w-full rounded-xl object-cover" />
            <button
              onClick={() => { setImageFile(null); setPreview(null); }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm text-gray-400 hover:border-purple-500 hover:text-purple-400"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            Add Photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

        {/* Privacy selector */}
        <div className="mb-3 flex gap-2">
          {privacyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPrivacy(opt.value)}
              className={`flex flex-1 flex-col items-center rounded-xl border py-2 text-xs transition-colors ${
                privacy === opt.value
                  ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              <span className="font-medium">{opt.label}</span>
              <span className="text-gray-500">{opt.desc}</span>
            </button>
          ))}
        </div>

        {/* Time capsule toggle */}
        <button
          onClick={() => setCapsule(!capsule)}
          className={`mb-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
            capsule ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 text-gray-400'
          }`}
        >
          <span>⏳</span>
          <span>Time Capsule</span>
          <span className="ml-auto text-xs text-gray-500">Hidden until a future date</span>
        </button>
        {capsule && (
          <input
            type="datetime-local"
            value={visibleAfter}
            onChange={(e) => setVisibleAfter(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mb-3 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
          />
        )}

        {uploadProgress && (
          <div className="mb-2 flex items-center gap-2 text-sm text-purple-300">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            {uploadProgress}
          </div>
        )}

        {error && (
          <div className="mb-2 rounded-xl bg-red-900/30 border border-red-500/30 p-3">
            <p className="text-sm text-red-400">{error}</p>
            {error.includes('Storage rules') && (
              <p className="mt-1 text-xs text-red-300/70">
                Fix: Firebase Console → Storage → Rules → paste the rules from <code className="font-mono">storage.rules</code> in your project root.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handlePost}
          disabled={saving}
          className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? (uploadProgress || 'Posting…') : 'Drop Echo 📍'}
        </button>
      </div>
    </div>
  );
}
