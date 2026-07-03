import { useEffect, useMemo, useRef, useState } from 'react';

// Lightweight client-side site search. Fetches the static /search-index.json
// once, then substring-matches the query against title/tags/series/description.
// CJK has no word boundaries, so a plain includes() is enough — no tokenizer.
// Title matches rank above tag matches above body matches.
export default function Search() {
  const [index, setIndex] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/search-index.json')
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {});
  }, []);

  // "/" or ⌘K / Ctrl+K focuses the box from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const scored = [];
    for (const p of index) {
      const title = p.title.toLowerCase();
      const tagHit = p.tags.some((t) => t.toLowerCase().includes(query));
      const hay = `${p.title} ${p.tags.join(' ')} ${p.series} ${p.description}`.toLowerCase();
      if (!hay.includes(query)) continue;
      const score = title.includes(query) ? 0 : tagHit ? 1 : 2;
      scored.push({ p, score });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 8).map((s) => s.p);
  }, [q, index]);

  useEffect(() => setActive(0), [q]);

  const go = (p) => {
    if (p) window.location.href = p.url;
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder="搜尋文章… ( / )"
        aria-label="搜尋文章"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-36 sm:w-52 bg-base border border-line rounded px-3 py-1 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
      />
      {open && q.trim() && (
        <ul className="absolute right-0 mt-1 w-72 max-h-80 overflow-auto bg-surface border border-line rounded shadow-lg z-50 list-none m-0 p-1">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">找不到「{q.trim()}」</li>
          ) : (
            results.map((p, i) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  onMouseEnter={() => setActive(i)}
                  className={`block px-3 py-2 rounded no-underline ${i === active ? 'bg-base' : ''}`}
                >
                  <span className="block text-sm text-ink">{p.title}</span>
                  <span className="block text-xs text-muted mt-0.5">
                    {p.category === 'food' ? '美食' : '技術'}
                    {p.tags.length ? ` · ${p.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}` : ''}
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
