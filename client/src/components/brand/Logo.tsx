import React from 'react';
import './Logo.css';

export interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'lockup';
  size?: number; // Height in px of the mark (or baseline for wordmark)
  tone?: 'dark' | 'light';
  detail?: 'full' | 'simple';
  animate?: boolean;
  className?: string;
  ariaLabel?: string;
}

const LETTERS = ['B', 'l', 'u', 'r', 'd', 'l', 'e'] as const;

// Per-letter opacities for the main layer
const MAIN_OPACITIES = [0.4, 0.55, 0.7, 0.82, 0.92, 1, 1];

// Per-letter opacities for the ghost layers (focus-pull)
const GHOST_OPACITIES = [0.5, 0.42, 0.32, 0.2, 0.1, 0, 0];

export const Logo: React.FC<LogoProps> = ({
  variant = 'lockup',
  size = 32,
  tone = 'dark',
  detail = 'simple',
  animate = false,
  className = '',
  ariaLabel,
}) => {
  const isLight = tone === 'light';

  // Proportional font size for the wordmark based on mark size
  // At size 32 -> ~24px font size. At size 48 -> ~36px font size.
  const fontSize = Math.round(size * 0.76);

  // Auto-simplify rule: if font size is below 32px, always force "simple" detail
  const effectiveDetail = fontSize < 32 ? 'simple' : detail;

  // Colors based on tone
  const mainTextColor = isLight ? '#2a2019' : '#f6efe3';
  const finalEColor = isLight ? '#e08a00' : '#ffc83d';
  const leftGhostColor = '#ff9f1c';
  const rightGhostColor = isLight ? '#ff5d5d' : '#ffc83d';
  const ghostMultiplier = isLight ? 0.8 : 1.0;

  // Render SVG Mark (viewBox 0 0 100 100)
  const renderMark = (isDecorative: boolean) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none"
      {...(isDecorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': ariaLabel || 'Blurdle' })}
    >
      {/* Outer rounded tile */}
      <rect
        width="100"
        height="100"
        rx="24"
        fill="#1f1813"
        stroke="#f6efe3"
        strokeOpacity="0.16"
      />

      {/* Big tiles (size 28.5, rx 3) */}
      <rect x="20" y="20" width="28.5" height="28.5" rx="3" fill="#f6efe3" />
      <rect x="51.5" y="20" width="28.5" height="28.5" rx="3" fill="#ffc83d" />
      <rect x="20" y="51.5" width="28.5" height="28.5" rx="3" fill="#ff9f1c" />

      {/* Medium tiles (size 13, rx 2) */}
      <rect x="51.5" y="51.5" width="13" height="13" rx="2" fill="#f6efe3" />
      <rect x="67" y="51.5" width="13" height="13" rx="2" fill="#ff9f1c" />
      <rect x="51.5" y="67" width="13" height="13" rx="2" fill="#ffc83d" />

      {/* Tiny tiles (size 5.5, rx 1) */}
      <rect x="67" y="67" width="5.5" height="5.5" rx="1" fill="#f6efe3" />
      <rect x="74.5" y="67" width="5.5" height="5.5" rx="1" fill="#ffc83d" />
      <rect x="67" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff9f1c" />
      <rect x="74.5" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff5d5d" />
    </svg>
  );

  // Render Wordmark HTML text
  const renderWordmark = () => {
    const isFull = effectiveDetail === 'full';

    return (
      <span
        className="relative inline-flex items-center font-sans font-bold select-none leading-none tracking-tightest"
        style={{
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.03em',
        }}
      >
        {/* Ghost layer 1: Left offset (-0.08em, amber) */}
        {isFull && (
          <span
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none select-none flex ${
              animate ? 'logo-ghost-left-anim' : ''
            }`}
            style={{
              transform: animate ? undefined : 'translateX(-0.08em)',
              color: leftGhostColor,
            }}
          >
            {LETTERS.map((letter, idx) => (
              <span
                key={`left-${idx}`}
                style={{ opacity: GHOST_OPACITIES[idx] * ghostMultiplier }}
              >
                {letter}
              </span>
            ))}
          </span>
        )}

        {/* Ghost layer 2: Right offset (+0.08em, yellow/red) */}
        {isFull && (
          <span
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none select-none flex ${
              animate ? 'logo-ghost-right-anim' : ''
            }`}
            style={{
              transform: animate ? undefined : 'translateX(0.08em)',
              color: rightGhostColor,
            }}
          >
            {LETTERS.map((letter, idx) => (
              <span
                key={`right-${idx}`}
                style={{ opacity: GHOST_OPACITIES[idx] * ghostMultiplier }}
              >
                {letter}
              </span>
            ))}
          </span>
        )}

        {/* Main sharp layer */}
        <span className="relative flex">
          {LETTERS.map((letter, idx) => {
            const isFinalE = idx === LETTERS.length - 1;
            const letterColor = isFinalE ? finalEColor : mainTextColor;
            const opacity = isFull ? MAIN_OPACITIES[idx] : 1;

            return (
              <span
                key={`main-${idx}`}
                style={{
                  color: letterColor,
                  opacity,
                }}
              >
                {letter}
              </span>
            );
          })}
        </span>
      </span>
    );
  };

  if (variant === 'mark') {
    return <span className={`inline-flex items-center ${className}`}>{renderMark(false)}</span>;
  }

  if (variant === 'wordmark') {
    return <span className={`inline-flex items-center ${className}`}>{renderWordmark()}</span>;
  }

  // Lockup = Mark + Wordmark
  const gapPx = Math.max(Math.round(size * 0.35), 8);

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: `${gapPx}px` }}
    >
      {renderMark(true)}
      {renderWordmark()}
    </span>
  );
};

export default Logo;
