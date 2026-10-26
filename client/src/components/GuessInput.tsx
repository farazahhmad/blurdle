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
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cinema-light/40 pointer-events-none">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
          placeholder={disabled ? 'Game over' : 'Search for a movie…'}
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
            w-full bg-cinema-gray text-cinema-light placeholder-cinema-light/30
            border border-white/10 rounded-xl pl-11 pr-4 py-3.5
            text-base font-medium
            focus:outline-none focus:border-cinema-accent/60 focus:ring-2
            focus:ring-cinema-accent/20 transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            ${open ? 'rounded-b-none border-b-transparent' : ''}
          `}
        />

        {/* Spinner */}
        {searchLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg
              className="w-4 h-4 text-cinema-accent animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
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
            absolute z-50 left-0 right-0 top-full
            bg-cinema-gray border border-white/10 border-t-0
            rounded-b-xl overflow-hidden shadow-2xl
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
                px-4 py-3 cursor-pointer select-none
                transition-colors duration-100
                border-b border-white/5 last:border-b-0
                ${idx === activeIndex
                  ? 'bg-cinema-accent/20 text-cinema-accent'
                  : 'text-cinema-light hover:bg-white/5'
                }
              `}
            >
              <span className="font-medium truncate">{movie.title}</span>
              <span
                className={`
                  ml-3 text-sm flex-shrink-0 tabular-nums
                  ${idx === activeIndex ? 'text-cinema-accent/70' : 'text-cinema-light/40'}
                `}
              >
                {movie.year}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* No results hint */}
      {open && !searchLoading && query.trim().length >= 2 && filtered.length === 0 && (
        <div className="
          absolute z-50 left-0 right-0 top-full
          bg-cinema-gray border border-white/10 border-t-0
          rounded-b-xl px-4 py-3 text-cinema-light/40 text-sm
        ">
          No movies found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
