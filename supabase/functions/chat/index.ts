import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  session_id: string;
  stream?: boolean;
}

interface RichContent {
  type: string;
  [key: string]: unknown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { message, session_id, stream = false }: ChatRequest = await req.json();

    if (!message || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load conversation context
    const conversationContext = await loadConversationContext(supabase, session_id);

    // Load AI instructions and Q&A overrides
    const { instructions, qaOverrides, knowledgeContent } = await loadAIConfig(supabase);

    // Check for Q&A override match
    const qaMatch = findQAMatch(message, qaOverrides);
    if (qaMatch) {
      // Save messages and return override response
      await saveMessage(supabase, session_id, 'user', message);
      const msgId = await saveMessage(supabase, session_id, 'assistant', qaMatch.answer);

      return new Response(
        JSON.stringify({
          response: qaMatch.answer,
          message_id: msgId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(instructions, knowledgeContent, conversationContext);

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationContext.recentMessages,
      { role: 'user', content: message },
    ];

    // Save user message
    await saveMessage(supabase, session_id, 'user', message);

    // Call AI API
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await callAI(lovableApiKey, messages, stream);

    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullResponse = '';

          try {
            const reader = aiResponse.body?.getReader();
            if (!reader) throw new Error('No response body');

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const text = new TextDecoder().decode(value);
              const lines = text.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content || '';
                    if (token) {
                      fullResponse += token;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
            }

            // Process the full response for rich content
            const richContent = extractRichContent(fullResponse);
            const suggestions = generateSuggestions(fullResponse, message);

            if (richContent.length > 0 || suggestions.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ rich_content: richContent, suggestions })}\n\n`)
              );
            }

            // Save assistant message
            await saveMessage(supabase, session_id, 'assistant', fullResponse, richContent);

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const data = await aiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

      // Process for rich content
      const richContent = extractRichContent(responseText);
      const suggestions = generateSuggestions(responseText, message);

      // Save assistant message
      const msgId = await saveMessage(supabase, session_id, 'assistant', responseText, richContent);

      return new Response(
        JSON.stringify({
          response: responseText,
          rich_content: richContent.length > 0 ? richContent : undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          message_id: msgId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function loadConversationContext(supabase: any, sessionId: string) {
  try {
    // Get recent messages
    const { data: convData } = await supabase
      .rpc('get_or_create_conversation', { p_session_id: sessionId });

    if (!convData) {
      return { recentMessages: [], customerInfo: null };
    }

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convData)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: customer } = await supabase
      .from('customers')
      .select('name, preferences, member_status')
      .eq('session_id', sessionId)
      .single();

    return {
      recentMessages: (messages || []).reverse().map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      customerInfo: customer,
    };
  } catch (error) {
    console.error('Error loading context:', error);
    return { recentMessages: [], customerInfo: null };
  }
}

async function loadAIConfig(supabase: any) {
  try {
    const [instrRes, qaRes, urlRes] = await Promise.all([
      supabase.from('admin_instructions').select('content').eq('is_active', true).order('priority', { ascending: false }),
      supabase.from('qa_overrides').select('*').eq('is_active', true),
      supabase.from('knowledge_urls').select('title, content').eq('is_active', true).not('content', 'is', null),
    ]);

    const instructions = (instrRes.data || []).map((i: any) => i.content).join('\n\n');
    const knowledgeContent = (urlRes.data || [])
      .map((u: any) => `### ${u.title}\n${u.content?.slice(0, 2000)}`)
      .join('\n\n');

    return {
      instructions,
      qaOverrides: qaRes.data || [],
      knowledgeContent,
    };
  } catch (error) {
    console.error('Error loading AI config:', error);
    return { instructions: '', qaOverrides: [], knowledgeContent: '' };
  }
}

function findQAMatch(message: string, qaOverrides: any[]) {
  const msgLower = message.toLowerCase();

  for (const qa of qaOverrides) {
    // Check for keyword match
    if (qa.keywords?.length > 0) {
      const hasKeywordMatch = qa.keywords.some((kw: string) =>
        msgLower.includes(kw.toLowerCase())
      );
      if (hasKeywordMatch) return qa;
    }

    // Check for question similarity
    const questionLower = qa.question.toLowerCase();
    if (
      msgLower.includes(questionLower) ||
      questionLower.includes(msgLower) ||
      similarity(msgLower, questionLower) > 0.7
    ) {
      return qa;
    }
  }

  return null;
}

function similarity(a: string, b: string): number {
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  const intersection = new Set([...aWords].filter((x) => bWords.has(x)));
  return intersection.size / Math.max(aWords.size, bWords.size);
}

function buildSystemPrompt(instructions: string, knowledge: string, context: any) {
  const customerContext = context.customerInfo
    ? `\n\nCustomer Info:\n- Name: ${context.customerInfo.name || 'Unknown'}\n- Status: ${context.customerInfo.member_status || 'guest'}\n- Interests: ${JSON.stringify(context.customerInfo.preferences || {})}`
    : '';

  return `${instructions}

You are Leila, the AI concierge for Sporting Club Beach in Beirut, Lebanon. Be helpful, friendly, and professional.

Guidelines:
- Provide accurate information about the club's facilities, services, and events
- When you don't know something, offer to connect the guest with a staff member
- Be culturally aware and respectful
- Keep responses concise but informative
- Suggest related services or amenities when appropriate
- If asked about weather, mention it's good for outdoor activities at the club
- If asked about location, the club is at Sporting Club Beach, Beirut, Lebanon (33.89°N, 35.50°E)
- Contact: phone +961 1 234 567, WhatsApp same number, email info@sportingclub.lb

${knowledge ? `\n\nKnowledge Base:\n${knowledge}` : ''}
${customerContext}

When responding:
1. If the topic relates to weather, outdoor activities, pool, or beach, consider mentioning current weather
2. If discussing location or directions, consider including map information
3. If social media or contact is relevant, suggest connecting via our social channels
4. Always be helpful and suggest follow-up questions the user might have`;
}

async function callAI(apiKey: string, messages: any[], stream: boolean) {
  const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-preview',
      messages,
      stream,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  return response;
}

async function saveMessage(
  supabase: any,
  sessionId: string,
  role: string,
  content: string,
  richContent?: RichContent[]
) {
  try {
    const { data } = await supabase.rpc('save_chat_message', {
      p_session_id: sessionId,
      p_role: role,
      p_content: content,
      p_rich_content: richContent ? JSON.stringify(richContent) : null,
    });
    return data;
  } catch (error) {
    console.error('Error saving message:', error);
    return null;
  }
}

function extractRichContent(text: string): RichContent[] {
  const content: RichContent[] = [];
  const textLower = text.toLowerCase();

  // Weather detection
  if (
    textLower.includes('weather') ||
    textLower.includes('sunny') ||
    textLower.includes('temperature') ||
    textLower.includes('perfect day')
  ) {
    content.push({
      type: 'weather',
      temperature: 28,
      conditions: 'Sunny',
      icon: '01d',
      humidity: 65,
      wind_speed: 12,
      recommendation: 'Perfect weather for outdoor activities at the club!',
    });
  }

  // Location/map detection
  if (
    textLower.includes('location') ||
    textLower.includes('where') ||
    textLower.includes('directions') ||
    textLower.includes('find us') ||
    textLower.includes('address')
  ) {
    content.push({
      type: 'map',
      address: 'Sporting Club Beach, Beirut, Lebanon',
      coordinates: { lat: 33.89, lng: 35.50 },
    });
  }

  // Contact detection
  if (
    textLower.includes('contact') ||
    textLower.includes('call') ||
    textLower.includes('phone') ||
    textLower.includes('reach us') ||
    textLower.includes('whatsapp')
  ) {
    content.push({
      type: 'contact',
      phone: '+961 1 234 567',
      whatsapp: '+961 1 234 567',
      email: 'info@sportingclub.lb',
    });
  }

  // Social media detection
  if (
    textLower.includes('social') ||
    textLower.includes('instagram') ||
    textLower.includes('facebook') ||
    textLower.includes('follow')
  ) {
    content.push({
      type: 'social',
      platform: 'instagram',
      url: 'https://instagram.com/sportingclub',
      label: 'Follow us for updates and events',
    });
  }

  return content;
}

function generateSuggestions(response: string, question: string): string[] {
  const textLower = response.toLowerCase();
  const suggestions: string[] = [];

  if (textLower.includes('pool')) {
    suggestions.push('What are the pool hours?');
    suggestions.push('Is there a kids pool area?');
  }

  if (textLower.includes('restaurant') || textLower.includes('dining')) {
    suggestions.push('Can I see the menu?');
    suggestions.push('Do I need a reservation?');
  }

  if (textLower.includes('tennis') || textLower.includes('court')) {
    suggestions.push('How do I book a court?');
    suggestions.push('Do you offer tennis lessons?');
  }

  if (textLower.includes('membership') || textLower.includes('member')) {
    suggestions.push('What membership options are available?');
    suggestions.push('What are the membership benefits?');
  }

  if (textLower.includes('event') || textLower.includes('party')) {
    suggestions.push('What events are coming up?');
    suggestions.push('Can I host a private event?');
  }

  // Default suggestions if none matched
  if (suggestions.length === 0) {
    suggestions.push('What facilities do you have?');
    suggestions.push('What are your opening hours?');
    suggestions.push('How can I contact you?');
  }

  return suggestions.slice(0, 3);
}
