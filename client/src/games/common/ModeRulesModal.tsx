import { useEffect, useRef } from 'react';

interface ModeRulesModalProps {
  title?: string;
  gameName?: string;
  icon?: string;
  rules: string[];
  scoringNotes?: string[];
  onClose: () => void;
}

export function ModeRulesModal({
  title,
  gameName,
  rules,
  scoringNotes,
  onClose,
}: ModeRulesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const name = title || gameName || 'Game';

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm card p-6 flex flex-col gap-5 animate-slide-up focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
            <span>Rules / {name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col gap-2.5 text-xs text-text-secondary leading-relaxed font-mono">
          {rules.map((rule, idx) => (
            <li key={idx} className="flex gap-2.5 items-start">
              <span className="text-text-tertiary tabular-nums shrink-0">{idx + 1}.</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        {scoringNotes && scoringNotes.length > 0 && (
          <div className="bg-surface-raised border border-border rounded-tile p-3 flex flex-col gap-1.5 text-xs font-mono text-text-tertiary">
            <span className="text-text-secondary uppercase tracking-mono-caps text-[11px]">
              Scoring
            </span>
            {scoringNotes.map((note, idx) => (
              <p key={idx}>· {note}</p>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="btn-primary w-full py-2.5 text-xs"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
