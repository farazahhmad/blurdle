import { useState, useRef, useEffect, useCallback } from 'react';
import type { MovieSearchResult } from '../types';

interface GuessInputProps {
  query: string;
  setQuery: (q: string) => void;
  searchResults: MovieSearchResult[];
  searchLoading: boolean;
  onSelect: (movie: MovieSearchResult) => void;
  disabled: boolean;
  guessedIds: number[];
}

export function GuessInput({
  query,
  setQuery,
  searchResults,
  searchLoading,
  onSelect,
  disabled,
  guessedIds,
}: GuessInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = searchResults.filter((r) => !guessedIds.includes(r.tmdbId));

  // Open dropdown when results arrive
  useEffect(() => {
    if (filtered.length > 0) {
      setOpen(true);
      setActiveIndex(-1);
    } else {
      setOpen(false);
    }
  }, [filtered.length]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && filtered[activeIndex]) {
            handleSelect(filtered[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [open, filtered, activeIndex] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    const el = items[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleSelect(movie: MovieSearchResult) {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(movie);
    inputRef.current?.focus();
  }

  const listboxId = 'guess-listbox';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `option-${activeIndex}` : undefined
          }
          aria-label="Search for a movie"
          placeholder={disabled ? 'Game over' : 'Search for a title...'}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (filtered.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          className={`
            w-full bg-surface text-text-primary placeholder:text-text-tertiary
            border border-border rounded-full pl-11 pr-10 py-3
            text-sm font-sans placeholder:font-mono
            focus:outline-none focus:border-border-strong focus-visible:ring-2 focus-visible:ring-white/40
            transition-colors duration-150
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        />

        {/* Spinner */}
        {searchLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 rounded-full border border-border border-t-white animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label="Movie suggestions"
          className="
            absolute z-50 left-0 right-0 top-full mt-2
            card divide-y divide-border overflow-hidden
            max-h-72 overflow-y-auto
          "
        >
          {filtered.map((movie, idx) => (
            <li
              key={movie.tmdbId}
              id={`option-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelect(movie);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`
                flex items-center justify-between
                px-4 py-3 cursor-pointer select-none text-sm
                transition-colors duration-150
                ${idx === activeIndex
                  ? 'bg-surface-raised text-text-primary'
                  : 'text-text-secondary hover:bg-surface-raised/50 hover:text-text-primary'
                }
              `}
            >
              <span className="font-medium truncate">{movie.title}</span>
              <span className="ml-3 font-mono text-xs text-text-tertiary shrink-0 tabular-nums">
                {movie.year}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* No results hint */}
      {open && !searchLoading && query.trim().length >= 2 && filtered.length === 0 && (
        <div className="
          absolute z-50 left-0 right-0 top-full mt-2
          card px-4 py-3 text-text-tertiary text-xs font-mono
        ">
          No matches found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
