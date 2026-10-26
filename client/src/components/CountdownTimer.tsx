import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  minimal?: boolean;
}

export function CountdownTimer({ minimal = false }: CountdownTimerProps = {}) {
  const { hours, minutes, seconds } = useCountdown();

  const pad = (n: number) => String(n).padStart(2, '0');

  if (minimal) {
    return (
      <span className="font-mono text-xs text-text-primary tabular-nums">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center sm:items-start gap-1 font-mono">
      <p className="text-xs uppercase tracking-mono-caps text-text-tertiary">
        Next Screening In
      </p>
      <div className="flex items-center gap-1 text-base font-medium text-text-primary tabular-nums">
        <span>{pad(hours)}</span>
        <span className="opacity-30">:</span>
        <span>{pad(minutes)}</span>
        <span className="opacity-30">:</span>
        <span>{pad(seconds)}</span>
      </div>
    </div>
  );
}
