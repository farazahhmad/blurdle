import { useCountdown } from '../hooks/useCountdown';

export function CountdownTimer() {
  const { hours, minutes, seconds } = useCountdown();

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs uppercase tracking-widest text-cinema-light/40 font-medium">
        Next movie in
      </p>
      <div className="flex items-center gap-1 font-mono text-2xl font-bold text-cinema-accent tabular-nums">
        <span>{pad(hours)}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{pad(minutes)}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{pad(seconds)}</span>
      </div>
    </div>
  );
}
