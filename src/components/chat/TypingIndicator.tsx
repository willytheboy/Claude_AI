import React from 'react';
import { cn } from '../../lib/utils';

interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

export function TypingIndicator({ name = 'Leila', className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4', className)}>
      <div className="flex gap-1.5 items-center bg-secondary rounded-2xl px-4 py-3 rounded-bl-md">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full typing-dot" />
        </div>
        <span className="text-sm text-muted-foreground ml-2">
          {name} is thinking...
        </span>
      </div>
    </div>
  );
}
