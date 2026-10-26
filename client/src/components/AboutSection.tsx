export function AboutSection() {
  return (
    <footer className="w-full py-8 px-4 border-t border-white/5 mt-8">
      <div className="max-w-xl mx-auto flex flex-col items-center gap-3 text-center">
        {/* TMDB logo */}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="The Movie Database (TMDB)"
          className="opacity-60 hover:opacity-100 transition-opacity duration-200"
        >
          <img
            src="/tmdb-logo.svg"
            alt="The Movie Database (TMDB)"
            className="h-7 w-auto"
          />
        </a>
        <p className="text-cinema-light/30 text-xs leading-relaxed max-w-xs">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="text-cinema-light/20 text-xs">
          PIXEL FRAME — A daily movie guessing game
        </p>
      </div>
    </footer>
  );
}
