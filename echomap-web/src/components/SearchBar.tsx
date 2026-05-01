'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

export interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (result: SearchResult) => void;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: NominatimItem[] = await res.json();
      const mapped = data.map((item) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setResults(mapped);
      setOpen(mapped.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce 350ms
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 350);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleSelect(result: SearchResult) {
    onSelect(result);
    setQuery(result.displayName.split(',')[0].trim());
    setOpen(false);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input row */}
      <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 shadow-xl backdrop-blur">
        {loading ? (
          <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        ) : (
          <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search places…"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
        {query && (
          <button onClick={handleClear} className="flex-shrink-0 text-gray-500 hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          {results.map((r, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); handleSelect(r); }}
              className="flex w-full items-start gap-2.5 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-0 hover:bg-white/5 active:bg-white/10"
            >
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.222-4.528 3.222-7.327a7.5 7.5 0 10-15 0c0 2.799 1.278 5.248 3.222 7.327a19.585 19.585 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <span className="line-clamp-2 text-sm leading-snug text-gray-200">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
