import type { GuessRecord } from '../types';

interface GuessChipsProps {
  guessRecords: GuessRecord[];
  maxGuesses: number;
}

export function GuessChips({ guessRecords, maxGuesses }: GuessChipsProps) {
  const slots = Array.from({ length: maxGuesses });

  return (
    <div className="w-full flex flex-col gap-2">
      <h3 className="font-mono text-xs uppercase tracking-mono-caps text-text-tertiary mb-0.5">
        Guesses ({guessRecords.length} of {maxGuesses})
      </h3>
      <div className="flex flex-col gap-2">
        {slots.map((_, idx) => {
          const record = guessRecords[idx];

          if (!record) {
            // Empty slot
            return (
              <div
                key={idx}
                className="h-10 rounded-full border border-border/50 border-dashed flex items-center px-4 font-mono text-xs text-text-tertiary"
              >
                <span>Slot {idx + 1}</span>
              </div>
            );
          }

          if (record.type === 'skipped') {
            return (
              <div
                key={idx}
                className="h-10 rounded-full border border-border bg-surface flex items-center px-4 gap-2.5 font-mono text-xs text-text-tertiary pop-in"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary inline-block" />
                <span className="italic">Skipped</span>
                <span className="ml-auto opacity-50">#{idx + 1}</span>
              </div>
            );
          }

          if (record.type === 'correct') {
            return (
              <div
                key={idx}
                className="h-10 rounded-full border border-status-green/40 bg-status-green/5 text-status-green flex items-center px-4 gap-2.5 text-xs font-mono pop-in"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
                <span className="font-medium text-text-primary truncate">{record.title}</span>
                <span className="ml-auto text-status-green/80 shrink-0 tabular-nums">{record.year}</span>
              </div>
            );
          }

          // Wrong: Muted red text and border (no filled red blocks)
          return (
            <div
              key={idx}
              className="h-10 rounded-full border border-status-red/30 bg-transparent text-status-red flex items-center px-4 gap-2.5 text-xs font-mono pop-in"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-red/80 inline-block" />
              <span className="text-text-secondary truncate">{record.title}</span>
              <span className="ml-auto text-text-tertiary shrink-0 tabular-nums">{record.year}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
