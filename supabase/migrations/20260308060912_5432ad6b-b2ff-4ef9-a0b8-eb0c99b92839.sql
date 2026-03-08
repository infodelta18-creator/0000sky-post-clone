
-- Table for users who liked a trending topic feed
CREATE TABLE public.trending_topic_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_name)
);

ALTER TABLE public.trending_topic_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all topic likes" ON public.trending_topic_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own topic likes" ON public.trending_topic_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topic likes" ON public.trending_topic_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table for users who pinned a trending topic feed
CREATE TABLE public.trending_topic_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_name)
);

ALTER TABLE public.trending_topic_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic pins" ON public.trending_topic_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topic pins" ON public.trending_topic_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topic pins" ON public.trending_topic_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table for reporting trending topic feeds
CREATE TABLE public.trending_topic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  topic_name TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, topic_name)
);

ALTER TABLE public.trending_topic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own topic reports" ON public.trending_topic_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
