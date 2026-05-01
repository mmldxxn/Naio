'use client';
import { useState } from 'react';
import { updateEcho } from '@/lib/echoes';
import { Echo, Privacy } from '@/types';

interface Props {
  echo: Echo;
  onClose: () => void;
  onSaved: () => void;
}

const privacyOptions: { value: Privacy; label: string; icon: string }[] = [
  { value: 'public',  label: 'Public',  icon: '🌍' },
  { value: 'friends', label: 'Friends', icon: '👥' },
  { value: 'private', label: 'Private', icon: '🔒' },
];

function toDatetimeLocal(d?: Date): string {
  if (!d) return '';
  // Format: YYYY-MM-DDTHH:MM
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function EditEchoModal({ echo, onClose, onSaved }: Props) {
  const [text, setText] = useState(echo.text ?? '');
  const [privacy, setPrivacy] = useState<Privacy>(echo.privacy);
  const [capsule, setCapsule] = useState(!!echo.visibleAfter);
  const [visibleAfter, setVisibleAfter] = useState(toDatetimeLocal(echo.visibleAfter));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!text.trim() && !echo.imageUrl) {
      setError('Message cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateEcho(echo.id, {
        text: text.trim(),
        privacy,
        visibleAfter: capsule && visibleAfter ? new Date(visibleAfter) : null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-[var(--surface)] p-5 pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit Echo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Text */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={4}
          placeholder="What's here? Leave a memory…"
          className="w-full resize-none rounded-xl bg-white/5 p-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
        />
        <div className="mb-3 text-right text-xs text-gray-500">{text.length}/280</div>

        {/* Image note */}
        {echo.imageUrl && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-400">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
            </svg>
            Photo attached — image cannot be changed after posting.
          </div>
        )}

        {/* Privacy */}
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
            </button>
          ))}
        </div>

        {/* Time capsule */}
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

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
