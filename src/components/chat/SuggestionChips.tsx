
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipsProps) {
  if (!suggestions.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3" />
        <span>You might also ask:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border border-border',
              'bg-background hover:bg-secondary transition-colors',
              'text-foreground hover:text-primary',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
