interface SkipButtonProps {
  onSkip: () => void;
  disabled: boolean;
}

export function SkipButton({ onSkip, disabled }: SkipButtonProps) {
  return (
    <button
      onClick={onSkip}
      disabled={disabled}
      aria-label="Skip this guess"
      className="
        flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
        border border-cinema-gray text-cinema-light/50 hover:text-cinema-light
        hover:border-cinema-light/30 hover:bg-cinema-gray/60
        transition-all duration-200
        disabled:opacity-30 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-cinema-accent/40
        whitespace-nowrap
      "
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 5v14" />
      </svg>
      Skip
    </button>
  );
}
