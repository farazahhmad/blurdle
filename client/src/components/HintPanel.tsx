interface HintPanelProps {
  hints?: {
    decade?: string;
    genres?: string[];
  };
  guessCount: number;
}

export function HintPanel({ hints, guessCount }: HintPanelProps) {
  const showDecade = guessCount >= 3 && hints?.decade;
  const showGenres = guessCount >= 4 && hints?.genres && hints.genres.length > 0;

  if (!showDecade && !showGenres) return null;

  return (
    <div className="w-full flex flex-col gap-2 animate-fade-in">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-cinema-light/40">
        Hints
      </h3>
      <div className="flex flex-wrap gap-2">
        {showDecade && (
          <div
            className="
              flex items-center gap-2 px-3 py-2
              bg-cinema-accent/10 border border-cinema-accent/30
              rounded-lg text-sm animate-fade-in
            "
          >
            <span>🎬</span>
            <span className="text-cinema-light/70 font-medium">Decade:</span>
            <span className="text-cinema-accent font-semibold">{hints!.decade}</span>
          </div>
        )}

        {showGenres && (
          <div
            className="
              flex items-center gap-2 px-3 py-2
              bg-cinema-accent/10 border border-cinema-accent/30
              rounded-lg text-sm animate-fade-in
            "
          >
            <span>🎭</span>
            <span className="text-cinema-light/70 font-medium">Genres:</span>
            <span className="text-cinema-accent font-semibold">
              {hints!.genres!.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
