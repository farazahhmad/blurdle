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
    <div className="w-full max-w-xl mx-auto px-4 pb-8 flex flex-col gap-6">
      {/* Title & Today Link */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-cinema-light">
            Puzzle Archive
          </h1>
          <p className="text-xs text-cinema-light/40 mt-0.5">
            Play previous days without affecting your streak
          </p>
        </div>
        <button
          onClick={onPlayToday}
          className="px-3 py-1.5 bg-cinema-accent/10 border border-cinema-accent/30 hover:bg-cinema-accent/20 text-cinema-accent text-xs font-semibold rounded-lg transition-colors uppercase tracking-wider"
        >
          Play Today 🎬
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cinema-gray border-t-cinema-accent animate-spin" />
          <p className="text-xs text-cinema-light/40 uppercase tracking-widest">Loading archive...</p>
        </div>
      )}

      {error && (
        <div className="bg-cinema-red/10 border border-cinema-red/30 text-cinema-light text-xs rounded-xl p-4 text-center">
          <p>{error}</p>
          <button
            onClick={() => loadData(page)}
            className="mt-3 px-3 py-1 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Calendar / Tile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item) => {
              const won = item.status === 'won';
              const lost = item.status === 'lost';
              const playing = item.status === 'playing';

              let badgeColor = 'bg-cinema-gray/30 text-cinema-light/40 border-white/5';
              let badgeText = 'Not Played';

              if (won) {
                badgeColor = 'bg-cinema-green/20 text-cinema-green border-cinema-green/30';
                badgeText = `${item.guessesUsed}/6 Won`;
              } else if (lost) {
                badgeColor = 'bg-cinema-red/20 text-cinema-red border-cinema-red/30';
                badgeText = 'Lost';
              } else if (playing) {
                badgeColor = 'bg-cinema-accent/20 text-cinema-accent border-cinema-accent/30';
                badgeText = 'Playing';
              }

              return (
                <button
                  key={item.puzzleNumber}
                  onClick={() => onSelectPuzzle(item.puzzleNumber)}
                  className="
                    group flex flex-col items-center justify-between p-3.5
                    bg-cinema-darker border border-white/5 hover:border-cinema-accent/40
                    rounded-xl transition-all duration-200 hover:-translate-y-0.5
                    text-left
                  "
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cinema-light group-hover:text-cinema-accent transition-colors">
                      #{item.puzzleNumber}
                    </span>
                    <span className="text-[10px] text-cinema-light/30">
                      {item.dateKey}
                    </span>
                  </div>

                  <div className={`w-full py-1 text-center rounded-md border text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}>
                    {badgeText}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
                className="px-3 py-1.5 bg-cinema-gray/40 hover:bg-cinema-gray/60 disabled:opacity-30 rounded-lg text-xs font-medium text-cinema-light transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-cinema-light/40 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1)}
                className="px-3 py-1.5 bg-cinema-gray/40 hover:bg-cinema-gray/60 disabled:opacity-30 rounded-lg text-xs font-medium text-cinema-light transition-colors"
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
