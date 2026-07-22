
CREATE TABLE public.store_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX store_follows_user_id_idx ON public.store_follows(user_id);
CREATE INDEX store_follows_store_id_idx ON public.store_follows(store_id);

GRANT SELECT, INSERT, DELETE ON public.store_follows TO authenticated;
GRANT ALL ON public.store_follows TO service_role;

ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

-- Users manage only their own follows
CREATE POLICY "Users read own follows" ON public.store_follows
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own follows" ON public.store_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own follows" ON public.store_follows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Store owners/members can read follow rows for their own store (for aggregate counts).
-- Individual user_id is exposed only to the store's own team; general public cannot read follower identities.
CREATE POLICY "Store team reads follows for their store" ON public.store_follows
  FOR SELECT TO authenticated USING (public.is_store_member(auth.uid(), store_id));
