-- Atomic lead status change + activity log (runs as caller, RLS applies)
CREATE OR REPLACE FUNCTION public.change_lead_status(_lead_id uuid, _next lead_status, _note text DEFAULT NULL)
RETURNS public.leads
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prev public.lead_status;
  ws uuid;
  updated public.leads;
BEGIN
  SELECT status, workspace_id INTO prev, ws FROM public.leads WHERE id = _lead_id;
  IF ws IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  UPDATE public.leads
     SET status = _next
   WHERE id = _lead_id
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Not allowed to update this lead';
  END IF;

  INSERT INTO public.lead_activities (workspace_id, lead_id, actor_id, type, title, body, metadata)
  VALUES (ws, _lead_id, auth.uid(), 'status_change',
          'Status changed from ' || prev || ' to ' || _next, _note,
          jsonb_build_object('from', prev, 'to', _next));

  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.change_lead_status(uuid, lead_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_lead_status(uuid, lead_status, text) TO authenticated;

-- Daily send counter for outbound rate limiting
CREATE OR REPLACE FUNCTION public.workspace_emails_sent_today(_workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.lead_emails
  WHERE workspace_id = _workspace_id
    AND created_at >= date_trunc('day', now());
$$;

REVOKE ALL ON FUNCTION public.workspace_emails_sent_today(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_emails_sent_today(uuid) TO authenticated;

-- Pagination / filter / search indexes
CREATE INDEX IF NOT EXISTS leads_ws_created_idx ON public.leads (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_ws_score_idx ON public.leads (workspace_id, score DESC);
CREATE INDEX IF NOT EXISTS leads_ws_status_idx ON public.leads (workspace_id, status);
CREATE INDEX IF NOT EXISTS leads_search_idx ON public.leads
  USING gin (to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || email || ' ' || coalesce(company,'')));
CREATE INDEX IF NOT EXISTS lead_emails_ws_created_idx ON public.lead_emails (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_queue_due_idx ON public.email_queue (status, scheduled_at);