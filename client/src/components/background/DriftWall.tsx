import React, { useEffect, useRef, useMemo } from 'react';
import './DriftWall.css';

export interface DriftWallProps {
  images: string[];
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  perspective?: number;
  speed?: number;
  variance?: number;
  dim?: number;
  fade?: boolean;
  className?: string;
}

export const DriftWall: React.FC<DriftWallProps> = ({
  images,
  columns = 6,
  tileWidth = 160,
  tileHeight = 240,
  gap = 16,
  radius = 12,
  tilt = 12,
  turn = -10,
  perspective = 1000,
  speed = 0.45,
  variance = 0.2,
  dim = 0.25,
  fade = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const offsetsRef = useRef<number[]>([]);

  // Distribute images among columns
  const columnData = useMemo(() => {
    if (!images || images.length === 0) return [];

    // Each column gets a list of items duplicated enough times to cycle seamlessly
    const cols: string[][] = Array.from({ length: columns }, () => []);
    
    // Distribute images across columns with stagger
    for (let c = 0; c < columns; c++) {
      const colItems: string[] = [];
      const colOffset = c * 3;
      // We need enough items to exceed the viewport height (e.g. 10-12 tiles per column)
      const count = 12;
      for (let i = 0; i < count; i++) {
        const imgIndex = (colOffset + i) % images.length;
        colItems.push(images[imgIndex]);
      }
      cols[c] = colItems;
    }
    return cols;
  }, [images, columns]);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery.matches;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // Initial offsets: stagger alternate columns
    const totalTileSpan = tileHeight + gap;
    offsetsRef.current = Array.from({ length: columns }, (_, idx) => {
      return (idx % 2 === 0 ? 0 : -totalTileSpan * 0.5);
    });

    let isDocumentVisible = !document.hidden;
    const handleVisibility = () => {
      isDocumentVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 16.667, 2.5); // normalize to ~60fps
      lastTime = currentTime;

      if (!reducedMotion && isDocumentVisible) {
        for (let c = 0; c < columns; c++) {
          const colEl = colRefs.current[c];
          if (!colEl) continue;

          // Subtle column-specific speed variance
          const colSpeedMultiplier = 1 + ((c % 3) - 1) * variance;
          offsetsRef.current[c] -= speed * colSpeedMultiplier * delta;

          // Wrap around seamlessly
          const singleCycle = totalTileSpan * 6; // wrap after 6 tiles
          if (offsetsRef.current[c] <= -singleCycle) {
            offsetsRef.current[c] += singleCycle;
          }

          colEl.style.transform = `translate3d(0, ${offsetsRef.current[c]}px, 0)`;
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [columns, tileHeight, gap, speed, variance]);

  if (!images || images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`driftwall-viewport ${className}`}
      style={
        {
          perspective: `${perspective}px`,
          '--driftwall-gap': `${gap}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div
        className="driftwall-scene"
        style={{
          transform: `rotateX(${tilt}deg) rotateY(${turn}deg)`,
        }}
      >
        <div className="driftwall-stage">
          {columnData.map((colImages, colIndex) => (
            <div
              key={colIndex}
              ref={(el) => { colRefs.current[colIndex] = el; }}
              className="driftwall-column"
            >
              {colImages.map((src, imgIndex) => (
                <div
                  key={imgIndex}
                  className="driftwall-tile"
                  style={{
                    width: `${tileWidth}px`,
                    height: `${tileHeight}px`,
                    borderRadius: `${radius}px`,
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    decoding="async"
                    onError={(e) => {
                      // Hide tile gracefully if a single network request fails
                      (e.target as HTMLElement).style.opacity = '0';
                    }}
                  />
                  {dim > 0 && (
                    <div
                      className="driftwall-tile-dim"
                      style={{ opacity: dim }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {fade && <div className="driftwall-fade-overlay" />}
    </div>
  );
};
