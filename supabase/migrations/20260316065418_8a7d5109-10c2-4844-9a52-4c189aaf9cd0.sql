
CREATE TABLE public.post_interaction_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  who_can_reply text NOT NULL DEFAULT 'anyone',
  allow_followers boolean NOT NULL DEFAULT false,
  allow_following boolean NOT NULL DEFAULT false,
  allow_mentioned boolean NOT NULL DEFAULT false,
  allow_quote_posts boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

ALTER TABLE public.post_interaction_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own post interaction settings"
  ON public.post_interaction_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view post interaction settings"
  ON public.post_interaction_settings
  FOR SELECT
  TO public
  USING (true);
