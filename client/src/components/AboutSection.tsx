import { Logo } from './brand/Logo';

export function AboutSection() {
  return (
    <footer className="w-full py-10 px-6 border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-text-tertiary">
        <div className="flex items-center gap-2.5">
          <Logo variant="mark" size={16} />
          <span className="text-text-secondary font-medium">BLURDLE</span>
          <span className="opacity-40">/</span>
          <span>Daily movie guessing game</span>
        </div>
        <p className="text-center sm:text-right max-w-md">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
