import { useEffect, useState } from 'react';

interface MovieFrameProps {
  frameUrl: string | null;
  frameLoading: boolean;
  currentLevel: number;
  maxGuesses: number;
}

const PIXEL_SIZES: Record<number, string> = {
  1: '8px',
  2: '16px',
  3: '32px',
  4: '64px',
  5: '128px',
  6: 'Native',
};

export function MovieFrame({ frameUrl, frameLoading, currentLevel, maxGuesses }: MovieFrameProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  // Crossfade when frame URL changes
  useEffect(() => {
    if (!frameUrl) return;
    setFading(true);
    const t = setTimeout(() => {
      setDisplayUrl(frameUrl);
      setFading(false);
    }, 100);
    return () => clearTimeout(t);
  }, [frameUrl]);

  const pixelSize = PIXEL_SIZES[currentLevel] || '32px';

  return (
    <div className="w-full flex flex-col items-center gap-2.5">
      {/* Frame container with film-strip sprocket holes */}
      <div className="w-full film-sprockets">
        <div className="w-full relative card overflow-hidden bg-surface">
          {/* 16:9 aspect ratio wrapper */}
          <div className="aspect-video bg-bg relative">
            {/* Skeleton shimmer */}
            {(frameLoading || !displayUrl) && (
              <div className="absolute inset-0 shimmer flex items-center justify-center">
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
                  Loading frame...
                </span>
              </div>
            )}

            {/* Actual frame image */}
            {displayUrl && (
              <img
                src={displayUrl}
                alt={`Movie frame – Level ${currentLevel} of ${maxGuesses}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  fading ? 'opacity-0' : 'opacity-100'
                }`}
                draggable={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Thin mono caption underneath */}
      <div className="w-full flex items-center justify-between px-1 text-xs font-mono text-text-tertiary">
        <span>Screen 1 · Level {currentLevel} of {maxGuesses}</span>
        <span className="tabular-nums">Resolution: {pixelSize}</span>
      </div>
    </div>
  );
}
