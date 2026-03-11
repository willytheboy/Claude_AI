import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '../../lib/utils';
import type { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingMessageId?: string;
  onRate?: (messageId: string, rating: 1 | 5) => void;
  className?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  streamingMessageId,
  onRate,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isStreaming]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 overflow-y-auto',
        'scrollbar-thin scrollbar-thumb-gray-300',
        className
      )}
    >
      <div className="flex flex-col py-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">&#127754;</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to Sporting Club!
              </h3>
              <p className="text-muted-foreground">
                I'm Leila, your digital concierge. Ask me anything about our facilities,
                services, events, or how I can help make your visit special.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === streamingMessageId}
            onRate={
              message.role === 'assistant' && onRate
                ? (rating) => onRate(message.id, rating)
                : undefined
            }
          />
        ))}

        {isLoading && !isStreaming && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
