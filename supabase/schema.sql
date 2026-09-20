-- ==============================================================================
-- ShrutiPagluChat - Supabase Schema Migration File
-- Run this script in your Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- Enable pg_trgm extension if not already enabled (for fuzzy username search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive index for fast username search
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING gin (username gin_trgm_ops);

-- 2. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conversation_pair UNIQUE (user_one, user_two),
  CONSTRAINT different_users CHECK (user_one <> user_two)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_one ON public.conversations(user_one);
CREATE INDEX IF NOT EXISTS idx_conversations_user_two ON public.conversations(user_two);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages (expires_at) WHERE expires_at IS NOT NULL;

-- 4. Create Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_json)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON public.push_subscriptions(user_id);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES
-- ------------------------------------------------------------------------------

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Conversations Policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" 
  ON public.conversations FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_one OR auth.uid() = user_two);

DROP POLICY IF EXISTS "Users can insert conversations they participate in" ON public.conversations;
CREATE POLICY "Users can insert conversations they participate in" 
  ON public.conversations FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_one OR auth.uid() = user_two);

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND (c.user_one = auth.uid() OR c.user_two = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.messages;
CREATE POLICY "Users can insert messages into their conversations" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND (c.user_one = auth.uid() OR c.user_two = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update message status in their conversations" ON public.messages;
CREATE POLICY "Users can update message status in their conversations" 
  ON public.messages FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND (c.user_one = auth.uid() OR c.user_two = auth.uid())
    )
  );

-- Push Subscriptions Policies
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" 
  ON public.push_subscriptions FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Trigger function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for cleaning up 24h expired image messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_images()
RETURNS void AS $$
BEGIN
  DELETE FROM public.messages
  WHERE message_type = 'image' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime & Full Replica Identity for CDC filtering
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel 
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.messages'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel 
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.conversations'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel 
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.profiles'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET SETUP (Execute in SQL Editor)
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Avatar images public read" ON storage.objects;
CREATE POLICY "Avatar images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Chat images public read" ON storage.objects;
CREATE POLICY "Chat images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
CREATE POLICY "Users can upload chat images" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'chat-images');
