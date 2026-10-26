import { useState, useEffect } from 'react';

interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeUntilMidnightUTC(): Countdown {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0); // next UTC midnight

  const diff = midnight.getTime() - now.getTime();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

export function useCountdown(): Countdown {
  const [countdown, setCountdown] = useState<Countdown>(getTimeUntilMidnightUTC);

  useEffect(() => {
    const tick = () => setCountdown(getTimeUntilMidnightUTC());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return countdown;
}
