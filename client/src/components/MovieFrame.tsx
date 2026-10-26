import { useEffect, useState } from 'react';

interface MovieFrameProps {
  frameUrl: string | null;
  frameLoading: boolean;
  currentLevel: number;
  maxGuesses: number;
}

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

  return (
    <div className="w-full flex flex-col items-center gap-2">
      {/* Level indicator */}
      <div className="flex items-center gap-3 self-end pr-1">
        <div className="flex gap-1.5">
          {Array.from({ length: maxGuesses }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i < currentLevel - 1
                  ? 'bg-cinema-red'
                  : i === currentLevel - 1
                  ? 'bg-cinema-accent'
                  : 'bg-cinema-gray'
              }`}
            />
          ))}
        </div>
        <span className="text-cinema-light/60 text-xs font-medium tracking-widest uppercase">
          Guess {currentLevel} / {maxGuesses}
        </span>
      </div>

      {/* Frame container */}
      <div
        className="w-full relative film-grain letterbox rounded-lg overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 0 0 1px rgba(232,160,69,0.15), 0 25px 60px rgba(0,0,0,0.8)' }}
      >
        {/* 16:9 aspect ratio wrapper */}
        <div className="aspect-video bg-cinema-darker relative">
          {/* Skeleton shimmer */}
          {(frameLoading || !displayUrl) && (
            <div className="absolute inset-0 shimmer flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-cinema-light/20">
                <svg className="w-12 h-12 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                </svg>
                <span className="text-sm tracking-widest uppercase font-light">Loading frame...</span>
              </div>
            </div>
          )}

          {/* Actual frame image */}
          {displayUrl && (
            <img
              src={displayUrl}
              alt={`Movie frame – guess ${currentLevel} of ${maxGuesses}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-600 ${
                fading ? 'opacity-0' : 'opacity-100 animate-crossfade'
              }`}
              draggable={false}
            />
          )}

          {/* Film strip holes decoration */}
          <div className="absolute inset-y-0 left-0 w-5 flex flex-col justify-around py-2 pointer-events-none z-20 opacity-40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-3 h-2 mx-auto bg-cinema-darker rounded-sm border border-black/50" />
            ))}
          </div>
          <div className="absolute inset-y-0 right-0 w-5 flex flex-col justify-around py-2 pointer-events-none z-20 opacity-40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-3 h-2 mx-auto bg-cinema-darker rounded-sm border border-black/50" />
            ))}
          </div>

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[8]"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
