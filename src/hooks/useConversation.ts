import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Conversation, ChatMessage } from '../types';

interface UseConversationReturn {
  conversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'conversation_id' | 'created_at'>) => Promise<ChatMessage | null>;
  updateMessageRating: (messageId: string, rating: 1 | 5) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
}

const MESSAGES_PER_PAGE = 50;

export function useConversation(sessionId: string): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Load or create conversation and messages
  useEffect(() => {
    async function loadConversation() {
      if (!sessionId) return;

      try {
        setIsLoading(true);

        // Get or create conversation using RPC
        const { data: conversationId, error: rpcError } = await supabase
          .rpc('get_or_create_conversation', { p_session_id: sessionId });

        if (rpcError) throw rpcError;

        // Load conversation details
        const { data: conversationData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convError) throw convError;
        setConversation(conversationData as Conversation);

        // Load messages
        const { data: messagesData, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(MESSAGES_PER_PAGE);

        if (msgError) throw msgError;
        setMessages(messagesData as ChatMessage[]);
        setHasMoreMessages(messagesData.length === MESSAGES_PER_PAGE);

      } catch (err) {
        console.error('Error loading conversation:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    loadConversation();
  }, [sessionId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const addMessage = useCallback(async (
    message: Omit<ChatMessage, 'id' | 'conversation_id' | 'created_at'>
  ): Promise<ChatMessage | null> => {
    if (!conversation?.id) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          ...message,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newMessage = data as ChatMessage;

      // Update local state (the realtime subscription might also do this)
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      return newMessage;
    } catch (err) {
      console.error('Error adding message:', err);
      throw err;
    }
  }, [conversation?.id]);

  const updateMessageRating = useCallback(async (messageId: string, rating: 1 | 5) => {
    try {
      // Update message rating
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ rating })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Create rating record
      await supabase
        .from('message_ratings')
        .insert({
          message_id: messageId,
          rating,
        });

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, rating } : m
        )
      );
    } catch (err) {
      console.error('Error updating message rating:', err);
      throw err;
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!conversation?.id || !messages.length) return;

    try {
      const oldestMessage = messages[0];

      const { data, error: loadError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (loadError) throw loadError;

      const olderMessages = (data as ChatMessage[]).reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  }, [conversation?.id, messages]);

  return {
    conversation,
    messages,
    isLoading,
    error,
    addMessage,
    updateMessageRating,
    loadMoreMessages,
    hasMoreMessages,
  };
}
