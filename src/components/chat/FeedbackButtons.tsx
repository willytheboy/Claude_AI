import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeedbackButtonsProps {
  messageId: string;
  initialRating?: number | null;
  onRate: (rating: 1 | 5) => void;
  className?: string;
}

export function FeedbackButtons({
  messageId,
  initialRating,
  onRate,
  className,
}: FeedbackButtonsProps) {
  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (newRating: 1 | 5) => {
    if (rating !== null || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onRate(newRating);
      setRating(newRating);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {rating === null ? (
        <>
          <button
            onClick={() => handleRate(5)}
            disabled={isSubmitting}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'text-muted-foreground hover:text-green-600 hover:bg-green-50',
              'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Helpful"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRate(1)}
            disabled={isSubmitting}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'text-muted-foreground hover:text-red-600 hover:bg-red-50',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Not helpful"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </>
      ) : (
        <span
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            rating === 5
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          )}
        >
          {rating === 5 ? (
            <>
              <ThumbsUp className="w-3 h-3" />
              <span>Thanks!</span>
            </>
          ) : (
            <>
              <ThumbsDown className="w-3 h-3" />
              <span>Noted</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
