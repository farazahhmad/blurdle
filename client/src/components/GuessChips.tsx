import type { GuessRecord } from '../types';

interface GuessChipsProps {
  guessRecords: GuessRecord[];
  maxGuesses: number;
}

export function GuessChips({ guessRecords, maxGuesses }: GuessChipsProps) {
  const slots = Array.from({ length: maxGuesses });

  return (
    <div className="w-full flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-cinema-light/40 mb-1">
        Guesses
      </h3>
      <div className="flex flex-col gap-2">
        {slots.map((_, idx) => {
          const record = guessRecords[idx];

          if (!record) {
            // Empty slot
            return (
              <div
                key={idx}
                className="
                  h-11 rounded-lg border-2 border-dashed border-cinema-gray/60
                  flex items-center px-4 gap-2 opacity-40
                "
              >
                <span className="text-xs text-cinema-light/30 font-medium tracking-widest uppercase">
                  #{idx + 1}
                </span>
              </div>
            );
          }

          if (record.type === 'skipped') {
            return (
              <div
                key={idx}
                className="
                  h-11 rounded-lg bg-cinema-gray/60
                  border border-white/5
                  flex items-center px-4 gap-3 pop-in
                "
              >
                <span className="text-sm">⏭️</span>
                <span className="text-sm text-cinema-light/50 font-medium italic">
                  Skipped
                </span>
                <span className="ml-auto text-xs text-cinema-light/30 font-medium tracking-widest">
                  #{idx + 1}
                </span>
              </div>
            );
          }

          if (record.type === 'correct') {
            return (
              <div
                key={idx}
                className="
                  h-11 rounded-lg
                  bg-cinema-green/20 border border-cinema-green/40
                  flex items-center px-4 gap-3 pop-in
                "
              >
                <span className="text-sm">✅</span>
                <span className="text-sm text-cinema-green font-semibold truncate">
                  {record.title}
                </span>
                <span className="ml-auto text-xs text-cinema-green/60 flex-shrink-0">
                  {record.year}
                </span>
              </div>
            );
          }

          // Wrong
          return (
            <div
              key={idx}
              className="
                h-11 rounded-lg
                bg-cinema-red/20 border border-cinema-red/40
                flex items-center px-4 gap-3 pop-in
              "
            >
              <span className="text-sm">❌</span>
              <span className="text-sm text-cinema-red/90 font-medium truncate">
                {record.title}
              </span>
              <span className="ml-auto text-xs text-cinema-red/50 flex-shrink-0">
                {record.year}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
