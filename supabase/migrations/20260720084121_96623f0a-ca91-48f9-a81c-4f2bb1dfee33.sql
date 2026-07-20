
CREATE TABLE public.store_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  worth_it boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.store_reports TO authenticated;
GRANT ALL ON public.store_reports TO service_role;

ALTER TABLE public.store_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own reports"
  ON public.store_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all reports"
  ON public.store_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete reports"
  ON public.store_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX store_reports_store_idx ON public.store_reports(store_id);
CREATE INDEX store_reports_created_idx ON public.store_reports(created_at DESC);
