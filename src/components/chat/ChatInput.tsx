import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  className?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask me anything...',
  voiceEnabled = false,
  onVoiceToggle,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-end gap-2 p-4 bg-background border-t border-border',
        className
      )}
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-2xl border border-input bg-background',
            'px-4 py-3 pr-12 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'scrollbar-thin scrollbar-thumb-gray-300'
          )}
        />
      </div>

      {/* Voice toggle button */}
      {onVoiceToggle && (
        <button
          type="button"
          onClick={onVoiceToggle}
          className={cn(
            'p-3 rounded-full transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-secondary',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            voiceEnabled && 'text-primary bg-primary/10'
          )}
          title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Send button */}
      <button
        type="submit"
        disabled={!message.trim() || isLoading || disabled}
        className={cn(
          'p-3 rounded-full bg-primary text-primary-foreground',
          'transition-all duration-200',
          'hover:bg-primary/90',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          message.trim() && !isLoading && 'scale-100',
          (!message.trim() || isLoading) && 'scale-95'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  );
}
