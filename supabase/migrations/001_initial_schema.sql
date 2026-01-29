-- =====================================================
-- SPORTING CLUB AI CONCIERGE - DATABASE SCHEMA
-- Complete database setup with security
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: ROLE-BASED ACCESS CONTROL
-- =====================================================

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- RLS for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PART 2: PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- PART 3: CUSTOMER & CONVERSATION TRACKING
-- =====================================================

-- Customers table (tracks anonymous and identified users)
CREATE TABLE public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    member_status TEXT DEFAULT 'guest' CHECK (member_status IN ('guest', 'member', 'vip')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_session_id ON public.customers(session_id);
CREATE INDEX idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;

-- Conversations table
CREATE TABLE public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    context_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_session_id ON public.conversations(session_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Chat messages table
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    rich_content JSONB,
    rating INTEGER CHECK (rating IS NULL OR rating IN (1, 5)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Message ratings table
CREATE TABLE public.message_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating IN (1, 5)),
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_ratings_message_id ON public.message_ratings(message_id);

-- RLS for customer/conversation tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_ratings ENABLE ROW LEVEL SECURITY;

-- Public can create and read their own data via session_id
CREATE POLICY "Anyone can create customers"
    ON public.customers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read customers"
    ON public.customers FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update customers by session"
    ON public.customers FOR UPDATE
    USING (true);

CREATE POLICY "Admins can manage customers"
    ON public.customers FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read conversations"
    ON public.conversations FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update conversations"
    ON public.conversations FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can create messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
    ON public.chat_messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update message ratings"
    ON public.chat_messages FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can create ratings"
    ON public.message_ratings FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read ratings"
    ON public.message_ratings FOR SELECT
    USING (true);

-- =====================================================
-- PART 4: AI TRAINING & KNOWLEDGE BASE
-- =====================================================

-- Admin instructions for AI
CREATE TABLE public.admin_instructions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Q&A Overrides
CREATE TABLE public.qa_overrides (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_overrides_keywords ON public.qa_overrides USING GIN(keywords);

-- Knowledge URLs
CREATE TABLE public.knowledge_urls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    content TEXT,
    last_scraped_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Files
CREATE TABLE public.knowledge_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content TEXT,
    file_type TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Alerts
CREATE TABLE public.admin_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message TEXT NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_alerts_unresolved ON public.admin_alerts(created_at DESC) WHERE NOT is_resolved;

-- Rated Answers (for feedback tracking)
CREATE TABLE public.rated_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    rating INTEGER NOT NULL,
    feedback TEXT,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for admin tables
ALTER TABLE public.admin_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rated_answers ENABLE ROW LEVEL SECURITY;

-- Public read for AI to access
CREATE POLICY "Public can read admin instructions"
    ON public.admin_instructions FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage admin instructions"
    ON public.admin_instructions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read qa overrides"
    ON public.qa_overrides FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage qa overrides"
    ON public.qa_overrides FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read knowledge urls"
    ON public.knowledge_urls FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage knowledge urls"
    ON public.knowledge_urls FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read knowledge files"
    ON public.knowledge_files FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage knowledge files"
    ON public.knowledge_files FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alerts"
    ON public.admin_alerts FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create alerts"
    ON public.admin_alerts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can create rated answers"
    ON public.rated_answers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view rated answers"
    ON public.rated_answers FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PART 5: RICH CONTENT MANAGEMENT
-- =====================================================

-- Club Images
CREATE TABLE public.club_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    url TEXT NOT NULL,
    storage_path TEXT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_club_images_category ON public.club_images(category) WHERE is_active = true;
CREATE INDEX idx_club_images_tags ON public.club_images USING GIN(tags);

-- Social Links
CREATE TABLE public.social_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'whatsapp', 'youtube', 'tiktok')),
    url TEXT NOT NULL,
    icon TEXT,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0
);

-- Quick Actions
CREATE TABLE public.quick_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    label TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('message', 'link', 'phone', 'email')),
    action_data TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- RLS for rich content tables
ALTER TABLE public.club_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read club images"
    ON public.club_images FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage club images"
    ON public.club_images FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read social links"
    ON public.social_links FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage social links"
    ON public.social_links FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read quick actions"
    ON public.quick_actions FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage quick actions"
    ON public.quick_actions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PART 6: HELPER FUNCTIONS
-- =====================================================

-- Function to get or create customer by session
CREATE OR REPLACE FUNCTION public.get_or_create_customer(p_session_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Try to find existing customer
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE session_id = p_session_id;

    -- Create if not exists
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (session_id)
        VALUES (p_session_id)
        RETURNING id INTO v_customer_id;
    END IF;

    RETURN v_customer_id;
END;
$$;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_session_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_id UUID;
    v_conversation_id UUID;
BEGIN
    -- Get or create customer
    v_customer_id := public.get_or_create_customer(p_session_id);

    -- Find most recent conversation (within last 24 hours)
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE customer_id = v_customer_id
      AND last_message_at > NOW() - INTERVAL '24 hours'
    ORDER BY last_message_at DESC
    LIMIT 1;

    -- Create new conversation if none exists
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (customer_id, session_id)
        VALUES (v_customer_id, p_session_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- Function to save chat message
CREATE OR REPLACE FUNCTION public.save_chat_message(
    p_session_id TEXT,
    p_role TEXT,
    p_content TEXT,
    p_rich_content JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_conversation_id UUID;
    v_message_id UUID;
BEGIN
    -- Get or create conversation
    v_conversation_id := public.get_or_create_conversation(p_session_id);

    -- Insert message
    INSERT INTO public.chat_messages (conversation_id, role, content, rich_content)
    VALUES (v_conversation_id, p_role, p_content, p_rich_content)
    RETURNING id INTO v_message_id;

    -- Update conversation last_message_at
    UPDATE public.conversations
    SET last_message_at = NOW()
    WHERE id = v_conversation_id;

    RETURN v_message_id;
END;
$$;

-- Function to update customer preferences
CREATE OR REPLACE FUNCTION public.update_customer_preferences(
    p_session_id TEXT,
    p_preferences JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.customers
    SET
        preferences = preferences || p_preferences,
        updated_at = NOW()
    WHERE session_id = p_session_id;
END;
$$;

-- =====================================================
-- PART 7: REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;

-- =====================================================
-- PART 8: INITIAL DATA
-- =====================================================

-- Insert default quick actions
INSERT INTO public.quick_actions (label, action_type, action_data, icon, display_order) VALUES
('Pool Hours', 'message', 'What are the pool hours?', 'waves', 1),
('Restaurant Menu', 'message', 'Can I see the restaurant menu?', 'utensils', 2),
('Book a Court', 'message', 'I want to book a tennis court', 'calendar', 3),
('Location', 'message', 'Where is the club located?', 'map-pin', 4);

-- Insert default social links (placeholders)
INSERT INTO public.social_links (platform, url, display_name, display_order) VALUES
('instagram', 'https://instagram.com/sportingclub', 'Instagram', 1),
('facebook', 'https://facebook.com/sportingclub', 'Facebook', 2),
('whatsapp', 'https://wa.me/9611234567', 'WhatsApp', 3);

-- Insert default admin instruction
INSERT INTO public.admin_instructions (content, priority) VALUES
('You are Leila, the AI concierge for Sporting Club Beach in Beirut, Lebanon. Be friendly, helpful, and professional. Provide accurate information about the club''s facilities, services, and events. When you don''t know something, offer to connect the guest with a staff member.', 100);
