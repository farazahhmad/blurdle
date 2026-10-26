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
    <div className="w-full flex flex-col gap-2">
      <h3 className="font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
        Revealed Clues
      </h3>
      <div className="flex flex-wrap gap-2">
        {showDecade && (
          <div className="badge-pill bg-surface border border-border px-3 py-1.5 text-xs font-mono">
            <span className="text-text-tertiary">Decade:</span>
            <span className="text-text-primary font-medium">{hints!.decade}</span>
          </div>
        )}

        {showGenres && (
          <div className="badge-pill bg-surface border border-border px-3 py-1.5 text-xs font-mono">
            <span className="text-text-tertiary">Genres:</span>
            <span className="text-text-primary font-medium">
              {hints!.genres!.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
