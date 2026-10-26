import { useEffect, useState } from 'react';
import { fetchArchiveList } from '../api/client';
import type { ArchiveListItem } from '../types';

interface ArchivePageProps {
  onSelectPuzzle: (puzzleNumber: number) => void;
  onPlayToday: () => void;
}

export function ArchivePage({ onSelectPuzzle, onPlayToday }: ArchivePageProps) {
  const [items, setItems] = useState<ArchiveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArchiveList(targetPage, 16);
      setItems(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-12 flex flex-col gap-6">
      {/* Title & Today Link */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block shadow-[0_0_6px_rgba(255,200,61,0.6)]" />
            <span>Archive</span>
            <span className="opacity-40">/</span>
            <span>Past Editions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Puzzle Archive
          </h1>
          <p className="text-xs font-mono text-text-secondary mt-1">
            Play previous days without affecting your active daily streak
          </p>
        </div>
        <button
          onClick={onPlayToday}
          className="btn-primary text-xs"
        >
          Play Today
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-border border-t-white animate-spin" />
          <p className="font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">Loading archive...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center max-w-sm mx-auto">
          <p className="text-status-red text-xs font-mono">{error}</p>
          <button
            onClick={() => loadData(page)}
            className="btn-secondary text-xs mt-3"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Calendar / Tile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {items.map((item) => {
              const won = item.status === 'won';
              const lost = item.status === 'lost';
              const playing = item.status === 'playing';

              return (
                <button
                  key={item.puzzleNumber}
                  onClick={() => onSelectPuzzle(item.puzzleNumber)}
                  className="
                    card p-4 text-left transition-colors cursor-pointer
                    hover:bg-surface-raised hover:border-border-strong
                    flex flex-col justify-between gap-3 group
                  "
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text-tertiary">
                      #{item.puzzleNumber}
                    </span>
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {item.dateKey}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {won && (
                      <span className="badge-pill border-status-green/30 text-status-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
                        {item.guessesUsed}/6 Won
                      </span>
                    )}
                    {lost && (
                      <span className="badge-pill border-status-red/30 text-status-red">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-red inline-block" />
                        Ended
                      </span>
                    )}
                    {playing && (
                      <span className="badge-pill border-status-amber/30 text-status-amber">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-amber inline-block" />
                        Playing
                      </span>
                    )}
                    {item.status === 'not_played' && (
                      <span className="badge-pill">
                        Play
                      </span>
                    )}
                    <span className="text-text-tertiary group-hover:text-text-primary text-xs transition-colors">
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 font-mono text-xs">
              <button
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
                className="btn-secondary text-xs px-3.5 py-1.5 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="px-3 text-text-tertiary tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1)}
                className="btn-secondary text-xs px-3.5 py-1.5 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
