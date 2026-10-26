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
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="w-6 h-6 rounded-full border-2 border-border border-t-white animate-spin" />
        <p className="text-text-tertiary font-mono text-xs tracking-mono-caps uppercase">
          Loading puzzle...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4 card max-w-md mx-auto">
        <h2 className="text-text-primary font-medium text-base text-center">
          Failed to load puzzle
        </h2>
        <p className="text-text-secondary text-xs text-center max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-xs mt-2"
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
    <div className="w-full max-w-xl mx-auto px-4 pb-12 flex flex-col gap-6">
      {/* Puzzle number & Navigation Eyebrow */}
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-mono-caps text-text-tertiary px-1">
        {onBackToArchive ? (
          <button
            onClick={onBackToArchive}
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors font-medium"
          >
            ← Archive
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block shadow-[0_0_6px_rgba(255,200,61,0.6)]" />
            <span>Classic</span>
          </div>
        )}
        <span>
          Puzzle #{gameState.puzzleNumber} {puzzleNumber ? '(Archive)' : ''}
        </span>
        {onPlayToday && puzzleNumber ? (
          <button
            onClick={onPlayToday}
            className="flex items-center gap-1.5 text-text-primary hover:underline font-medium"
          >
            Today →
          </button>
        ) : (
          <span className="w-6"></span>
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
          {gameState.status === 'won' ? 'View Result' : 'View Solution'}
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
