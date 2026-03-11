import { useState, useCallback, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { SuggestionChips } from './SuggestionChips';
import { SocialLinksBar } from '../RichContent/SocialLinksBar';
import { useCustomer } from '../../hooks/useCustomer';
import { useConversation } from '../../hooks/useConversation';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { cn, getGreeting } from '../../lib/utils';
import type { ChatMessage, RichContent } from '../../types';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
  const { sessionId, customer } = useCustomer();
  const {
    messages,
    isLoading: conversationLoading,
    addMessage,
    updateMessageRating,
  } = useConversation(sessionId);
  const { sendMessage, streamingState } = useStreamingChat();

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Sync messages from conversation hook
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const handleSend = useCallback(async (content: string) => {
    // Create optimistic user message
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: '',
      role: 'user',
      content,
      rich_content: null,
      rating: null,
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setSuggestions([]);

    try {
      // Save user message to database
      const savedUserMessage = await addMessage({
        role: 'user',
        content,
        rich_content: null,
        rating: null,
      });

      if (savedUserMessage) {
        // Update local message with real ID
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? savedUserMessage : m
          )
        );
      }

      // Create optimistic assistant message for streaming
      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMessage: ChatMessage = {
        id: tempAssistantId,
        conversation_id: '',
        role: 'assistant',
        content: '',
        rich_content: null,
        rating: null,
        created_at: new Date().toISOString(),
      };

      setLocalMessages((prev) => [...prev, tempAssistantMessage]);
      setStreamingMessageId(tempAssistantId);

      // Send message and stream response
      const response = await sendMessage(
        content,
        sessionId,
        (token) => {
          // Update streaming message with each token
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: m.content + token }
                : m
            )
          );
        }
      );

      if (response) {
        // Save assistant message to database
        const savedAssistantMessage = await addMessage({
          role: 'assistant',
          content: response.response,
          rich_content: response.rich_content as RichContent[] || null,
          rating: null,
        });

        if (savedAssistantMessage) {
          // Update local message with real ID and full content
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? {
                    ...savedAssistantMessage,
                    rich_content: response.rich_content || null,
                  }
                : m
            )
          );
        }

        // Set suggestions
        if (response.suggestions) {
          setSuggestions(response.suggestions);
        }

        // Handle voice response
        if (voiceEnabled && response.response) {
          // Text-to-speech would be triggered here
          // await playTextToSpeech(response.response);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the optimistic assistant message on error
      setLocalMessages((prev) =>
        prev.filter((m) => !m.id.startsWith('temp-assistant'))
      );
    } finally {
      setStreamingMessageId(null);
    }
  }, [sessionId, addMessage, sendMessage, voiceEnabled]);

  const handleRate = useCallback(async (messageId: string, rating: 1 | 5) => {
    try {
      await updateMessageRating(messageId, rating);
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, rating } : m
        )
      );
    } catch (error) {
      console.error('Error rating message:', error);
    }
  }, [updateMessageRating]);

  const handleQuickAction = useCallback((action: string) => {
    handleSend(action);
  }, [handleSend]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  const isLoading = conversationLoading || streamingState.isStreaming;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex-none bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl">&#127754;</span>
          </div>
          <div>
            <h1 className="font-semibold text-lg">Sporting Club AI Concierge</h1>
            <p className="text-sm text-primary-foreground/80">
              {customer?.name ? `${getGreeting()}, ${customer.name}!` : 'Leila - Your Digital Concierge'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions (shown when no messages) */}
      {localMessages.length === 0 && (
        <div className="flex-none p-4 bg-secondary/30">
          <QuickActions onAction={handleQuickAction} />
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={localMessages}
        isLoading={isLoading && !streamingState.isStreaming}
        isStreaming={streamingState.isStreaming}
        streamingMessageId={streamingMessageId || undefined}
        onRate={handleRate}
        className="flex-1"
      />

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="flex-none px-4 pb-2">
          <SuggestionChips
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
          />
        </div>
      )}

      {/* Social Links */}
      <div className="flex-none border-t border-border">
        <SocialLinksBar />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        placeholder="Ask me anything..."
      />
    </div>
  );
}
