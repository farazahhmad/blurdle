interface SkipButtonProps {
  onSkip: () => void;
  disabled: boolean;
}

export function SkipButton({ onSkip, disabled }: SkipButtonProps) {
  return (
    <button
      type="button"
      onClick={onSkip}
      disabled={disabled}
      aria-label="Skip this guess"
      className="btn-secondary whitespace-nowrap py-3 px-5 text-sm font-mono shrink-0"
    >
      <svg className="w-3.5 h-3.5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 5v14" />
      </svg>
      <span>Skip</span>
    </button>
  );
}
