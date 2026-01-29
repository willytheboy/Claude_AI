import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { ChatResponse, RichContent } from '../types';

interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  error: Error | null;
}

interface UseStreamingChatReturn {
  sendMessage: (
    message: string,
    sessionId: string,
    onToken?: (token: string) => void
  ) => Promise<ChatResponse | null>;
  cancelStream: () => void;
  streamingState: StreamingState;
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    sessionId: string,
    onToken?: (token: string) => void
  ): Promise<ChatResponse | null> => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setStreamingState({
      isStreaming: true,
      streamedText: '',
      error: null,
    });

    try {
      // Get the Supabase URL and key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let richContent: RichContent[] = [];
        let suggestions: string[] = [];
        let quickActions: Array<{ label: string; action: string }> = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.token) {
                    fullText += parsed.token;
                    setStreamingState((prev) => ({
                      ...prev,
                      streamedText: fullText,
                    }));
                    onToken?.(parsed.token);
                  }

                  if (parsed.rich_content) {
                    richContent = parsed.rich_content;
                  }

                  if (parsed.suggestions) {
                    suggestions = parsed.suggestions;
                  }

                  if (parsed.quick_actions) {
                    quickActions = parsed.quick_actions;
                  }
                } catch {
                  // Non-JSON data, might be plain text token
                  if (data && data !== '[DONE]') {
                    fullText += data;
                    setStreamingState((prev) => ({
                      ...prev,
                      streamedText: fullText,
                    }));
                    onToken?.(data);
                  }
                }
              }
            }
          }
        }

        setStreamingState({
          isStreaming: false,
          streamedText: fullText,
          error: null,
        });

        return {
          response: fullText,
          rich_content: richContent.length > 0 ? richContent : undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          quick_actions: quickActions.length > 0 ? quickActions : undefined,
        };
      } else {
        // Handle non-streaming JSON response
        const data = await response.json();

        setStreamingState({
          isStreaming: false,
          streamedText: data.response || '',
          error: null,
        });

        return data as ChatResponse;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStreamingState((prev) => ({
          ...prev,
          isStreaming: false,
        }));
        return null;
      }

      console.error('Error sending message:', err);
      setStreamingState({
        isStreaming: false,
        streamedText: '',
        error: err as Error,
      });
      throw err;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStreamingState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  return {
    sendMessage,
    cancelStream,
    streamingState,
  };
}
