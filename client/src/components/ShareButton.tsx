import { useState, useCallback } from 'react';
import type { GuessRecord } from '../types';

interface ShareButtonProps {
  puzzleNumber: number;
  guessRecords: GuessRecord[];
  maxGuesses: number;
  status: 'won' | 'lost';
}

export function ShareButton({
  puzzleNumber,
  guessRecords,
  maxGuesses,
  status,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateShareText = useCallback(() => {
    const score =
      status === 'won'
        ? `${guessRecords.filter((g) => g.type !== 'skipped').length}/${maxGuesses}`
        : 'X/6';

    const emojis = Array.from({ length: maxGuesses }).map((_, i) => {
      const record = guessRecords[i];
      if (!record) return '⬛';
      if (record.type === 'correct') return '🟩';
      return '🟥';
    });

    return `Blurdle #${puzzleNumber} ${score}\n${emojis.join('')}\nhttps://blurdle.gg`;
  }, [puzzleNumber, guessRecords, maxGuesses, status]);

  const handleShare = async () => {
    const text = generateShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Blurdle', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: try clipboard anyway
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silently ignore clipboard errors
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="btn-primary"
      aria-label="Share your result"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Share Result</span>
        </>
      )}
    </button>
  );
}
