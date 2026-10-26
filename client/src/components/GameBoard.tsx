import { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { MovieFrame } from './MovieFrame';
import { GuessInput } from './GuessInput';
import { GuessChips } from './GuessChips';
import { HintPanel } from './HintPanel';
import { ResultModal } from './ResultModal';
import { SkipButton } from './SkipButton';

interface GameBoardProps {
  puzzleNumber?: number;
  onBackToArchive?: () => void;
  onPlayToday?: () => void;
  onOpenAuth?: () => void;
  isLoggedIn?: boolean;
}

export function GameBoard({
  puzzleNumber,
  onBackToArchive,
  onPlayToday,
  onOpenAuth,
  isLoggedIn,
}: GameBoardProps = {}) {
  const {
    gameState,
    loading,
    error,
    frameUrl,
    frameLoading,
    searchResults,
    searchLoading,
    query,
    setQuery,
    guessRecords,
    revealData,
    makeGuess,
    skip,
    stats,
  } = useGame({ puzzleNumber });

  const [showResult, setShowResult] = useState(false);

  const isFinished = gameState?.status === 'won' || gameState?.status === 'lost';

  // Auto-show result modal when game finishes (delayed for dramatic effect)
  useEffect(() => {
    if (isFinished && revealData && !showResult) {
      const t = setTimeout(() => setShowResult(true), 800);
      return () => clearTimeout(t);
    }
  }, [isFinished, revealData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-cinema-gray border-t-cinema-accent animate-spin" />
        </div>
        <p className="text-cinema-light/40 text-sm tracking-widest uppercase animate-pulse">
          Loading today&rsquo;s puzzle&hellip;
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
        <div className="text-4xl">🎬</div>
        <h2 className="text-cinema-light font-semibold text-lg text-center">
          Failed to load puzzle
        </h2>
        <p className="text-cinema-light/40 text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!gameState) return null;

  const isPlaying = gameState.status === 'playing';
  const guessedIds = guessRecords.map((r) => r.tmdbId);

  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-8 flex flex-col gap-5">
      {/* Puzzle number & Navigation */}
      <div className="flex items-center justify-between px-1">
        {onBackToArchive ? (
          <button
            onClick={onBackToArchive}
            className="flex items-center gap-1.5 text-xs text-cinema-accent hover:underline uppercase tracking-wider font-semibold"
          >
            ← Back to Archive
          </button>
        ) : (
          <span className="w-10"></span>
        )}
        <span className="text-xs text-cinema-light/40 uppercase tracking-widest font-bold">
          Puzzle #{gameState.puzzleNumber} {puzzleNumber ? '(Archive)' : ''}
        </span>
        {onPlayToday && puzzleNumber ? (
          <button
            onClick={onPlayToday}
            className="flex items-center gap-1.5 text-xs text-cinema-accent hover:underline uppercase tracking-wider font-semibold"
          >
            Play Today →
          </button>
        ) : (
          <span className="w-10"></span>
        )}
      </div>

      {/* Movie Frame */}
      <MovieFrame
        frameUrl={frameUrl}
        frameLoading={frameLoading}
        currentLevel={gameState.currentLevel}
        maxGuesses={gameState.maxGuesses}
      />

      {/* Hint Panel */}
      <HintPanel hints={gameState.hints} guessCount={guessRecords.length} />

      {/* Input + Skip */}
      {isPlaying && (
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <GuessInput
              query={query}
              setQuery={setQuery}
              searchResults={searchResults}
              searchLoading={searchLoading}
              onSelect={makeGuess}
              disabled={!isPlaying}
              guessedIds={guessedIds}
            />
          </div>
          <SkipButton onSkip={skip} disabled={!isPlaying} />
        </div>
      )}

      {/* Guess Chips */}
      <GuessChips
        guessRecords={guessRecords}
        maxGuesses={gameState.maxGuesses}
      />

      {/* View Result button if game over and modal closed */}
      {isFinished && !showResult && (
        <button
          onClick={() => setShowResult(true)}
          className="btn-primary w-full text-center"
        >
          {gameState.status === 'won' ? '🎉 View Result' : '💀 See the Answer'}
        </button>
      )}

      {/* Result Modal */}
      {showResult && isFinished && (
        <ResultModal
          status={gameState.status as 'won' | 'lost'}
          revealData={revealData}
          guessRecords={guessRecords}
          maxGuesses={gameState.maxGuesses}
          puzzleNumber={gameState.puzzleNumber}
          stats={stats}
          onClose={() => setShowResult(false)}
          onOpenAuth={onOpenAuth}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
