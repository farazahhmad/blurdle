import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { DriftWall } from './DriftWall';

interface BackgroundPosterItem {
  id: number;
  title?: string;
  poster: string;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const AppBackground: React.FC = () => {
  const { path } = useRouter();
  const [posters, setPosters] = useState<BackgroundPosterItem[]>([]);

  useEffect(() => {
    fetch('/background-posters.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load background-posters.json');
        return res.json() as Promise<BackgroundPosterItem[]>;
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPosters(shuffleArray(data));
        }
      })
      .catch((err) => {
        console.warn('Background posters could not be loaded:', err);
      });
  }, []);

  const imageUrls = useMemo(() => {
    return posters.map((p) => {
      if (p.poster.startsWith('http')) return p.poster;
      return `https://image.tmdb.org/t/p/w185${p.poster}`;
    });
  }, [posters]);

  // Determine target opacity based on current route
  const isHome = path === '/';
  const isGame = ['/classic', '/flashlight', '/double-exposure', '/narrator'].includes(path);
  const opacity = isHome ? 0.22 : isGame ? 0.14 : 0.16;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
      tabIndex={-1}
      // @ts-expect-error React 18 inert attribute
      inert=""
    >
      {/* Drifting poster wall with atmospheric blur & dynamic route opacity */}
      <div
        className="w-full h-full transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          filter: 'blur(1px)',
        }}
      >
        {imageUrls.length > 0 && (
          <DriftWall
            images={imageUrls}
            columns={6}
            tileWidth={170}
            tileHeight={255}
            gap={18}
            radius={14}
            tilt={10}
            turn={-8}
            perspective={1100}
            speed={0.35}
            variance={0.2}
            dim={0}
            fade={true}
          />
        )}
      </div>

      {/* Warm theater projector beam from top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255, 200, 61, 0.08), transparent 80%)',
        }}
      />

      {/* Radial vignette overlay to keep text and central game board pristine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 35%, rgba(22, 17, 14, 0.45) 75%, #16110e 98%)',
        }}
      />
    </div>
  );
};
