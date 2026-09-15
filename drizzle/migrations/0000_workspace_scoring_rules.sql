CREATE TABLE public.scoring_rules (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  icp_weight integer NOT NULL DEFAULT 35,
  intent_weight integer NOT NULL DEFAULT 30,
  engagement_weight integer NOT NULL DEFAULT 20,
  confidence_weight integer NOT NULL DEFAULT 15,
  target_industries text[] NOT NULL DEFAULT '{}',
  target_countries text[] NOT NULL DEFAULT '{}',
  target_sizes text[] NOT NULL DEFAULT ARRAY['200','500','1000','5000','enterprise'],
  target_titles text[] NOT NULL DEFAULT ARRAY['head','director','vp','chief','founder','owner','manager'],
  intent_keywords text[] NOT NULL DEFAULT ARRAY['pricing','demo','budget','buy','urgent','evaluat','trial','proposal'],
  mql_threshold integer NOT NULL DEFAULT 70,
  sql_threshold integer NOT NULL DEFAULT 85,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scoring_rules TO authenticated;
GRANT ALL ON public.scoring_rules TO service_role;

ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read scoring rules" ON public.scoring_rules
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Managers insert scoring rules" ON public.scoring_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers update scoring rules" ON public.scoring_rules
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));

CREATE TRIGGER scoring_rules_updated_at BEFORE UPDATE ON public.scoring_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.scoring_rules (workspace_id)
  SELECT id FROM public.workspaces ON CONFLICT DO NOTHING;

-- Multi-dimensional, workspace-configurable scoring
CREATE OR REPLACE FUNCTION public.score_lead()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  r public.scoring_rules%ROWTYPE;
  icp integer := 0;
  intent integer := 0;
  engagement integer := 0;
  confidence integer := 0;
  total integer := 0;
  wsum integer;
  domain text;
  reasons text[] := '{}';
  kw text;
  opens integer := 0;
  clicks integer := 0;
  replies integer := 0;
  filled integer := 0;
BEGIN
  SELECT * INTO r FROM public.scoring_rules WHERE workspace_id = NEW.workspace_id;
  IF NOT FOUND THEN
    INSERT INTO public.scoring_rules (workspace_id) VALUES (NEW.workspace_id)
      ON CONFLICT DO NOTHING;
    SELECT * INTO r FROM public.scoring_rules WHERE workspace_id = NEW.workspace_id;
  END IF;
  IF NOT FOUND THEN
    r.icp_weight := 35; r.intent_weight := 30; r.engagement_weight := 20; r.confidence_weight := 15;
    r.target_sizes := ARRAY['200','500','1000','5000','enterprise'];
    r.target_titles := ARRAY['head','director','vp','chief','founder','owner','manager'];
    r.intent_keywords := ARRAY['pricing','demo','budget','buy','urgent','evaluat'];
    r.target_industries := '{}'; r.target_countries := '{}';
    r.mql_threshold := 70; r.sql_threshold := 85;
  END IF;

  /* ---------- ICP fit (0-100) ---------- */
  IF NEW.company_size IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(r.target_sizes) s WHERE NEW.company_size ILIKE '%' || s || '%'
  ) THEN
    icp := icp + 40; reasons := reasons || 'Company size matches your ICP';
  ELSIF NEW.company_size IS NOT NULL THEN
    icp := icp + 15;
  END IF;

  IF cardinality(r.target_industries) = 0 THEN
    icp := icp + 15;
  ELSIF NEW.industry IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(r.target_industries) i WHERE NEW.industry ILIKE '%' || i || '%'
  ) THEN
    icp := icp + 25; reasons := reasons || ('Industry ' || NEW.industry || ' is a target industry');
  END IF;

  IF cardinality(r.target_countries) = 0 THEN
    icp := icp + 10;
  ELSIF NEW.country IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(r.target_countries) c WHERE NEW.country ILIKE '%' || c || '%'
  ) THEN
    icp := icp + 15; reasons := reasons || ('Located in target market ' || NEW.country);
  END IF;

  IF NEW.job_title IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(r.target_titles) t WHERE NEW.job_title ILIKE '%' || t || '%'
  ) THEN
    icp := icp + 20; reasons := reasons || ('Seniority match: ' || NEW.job_title);
  END IF;
  icp := LEAST(100, icp);

  /* ---------- Intent (0-100) ---------- */
  intent := intent + CASE NEW.source
    WHEN 'referral' THEN 45
    WHEN 'website_form' THEN 38
    WHEN 'chatbot' THEN 34
    WHEN 'webinar' THEN 28
    WHEN 'paid_ads' THEN 20
    WHEN 'outbound' THEN 12
    ELSE 8 END;

  IF NEW.notes IS NOT NULL THEN
    intent := intent + LEAST(15, length(NEW.notes) / 40);
    FOREACH kw IN ARRAY r.intent_keywords LOOP
      IF NEW.notes ILIKE '%' || kw || '%' THEN
        intent := intent + 10;
        reasons := reasons || ('Mentioned "' || kw || '" in their message');
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NEW.marketing_consent THEN intent := intent + 8; END IF;
  IF NEW.status IN ('meeting','sql') THEN intent := intent + 20; END IF;
  intent := LEAST(100, intent);

  /* ---------- Engagement (0-100) ---------- */
  IF TG_OP = 'UPDATE' THEN
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'opened'),
      COUNT(*) FILTER (WHERE event_type = 'clicked'),
      COUNT(*) FILTER (WHERE event_type = 'replied')
    INTO opens, clicks, replies
    FROM public.email_events WHERE lead_id = NEW.id;
  END IF;

  engagement := LEAST(100,
    LEAST(30, opens * 10) + LEAST(30, clicks * 15) + LEAST(40, replies * 40));
  IF replies > 0 THEN reasons := reasons || 'Replied to an outreach email'; END IF;
  IF NEW.last_contacted_at IS NULL AND engagement = 0 THEN
    reasons := reasons || 'No outreach engagement yet';
  END IF;

  /* ---------- Data confidence (0-100) ---------- */
  domain := lower(split_part(NEW.email, '@', 2));
  IF domain NOT IN ('gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','proton.me') THEN
    confidence := confidence + 40;
    reasons := reasons || 'Business email domain';
  ELSE
    reasons := reasons || 'Personal email domain lowers confidence';
  END IF;

  filled := (CASE WHEN NEW.company IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN NEW.job_title IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN NEW.phone IS NOT NULL AND length(NEW.phone) > 5 THEN 1 ELSE 0 END)
          + (CASE WHEN NEW.company_size IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN NEW.industry IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN NEW.country IS NOT NULL THEN 1 ELSE 0 END);
  confidence := LEAST(100, confidence + filled * 10);

  /* ---------- Weighted total ---------- */
  wsum := GREATEST(1, r.icp_weight + r.intent_weight + r.engagement_weight + r.confidence_weight);
  total := ROUND((icp * r.icp_weight + intent * r.intent_weight
                 + engagement * r.engagement_weight + confidence * r.confidence_weight)::numeric / wsum);
  total := GREATEST(0, LEAST(100, total));

  NEW.score := total;
  NEW.score_breakdown := jsonb_build_object(
    'icp_fit', icp,
    'intent', intent,
    'engagement', engagement,
    'data_confidence', confidence,
    'weights', jsonb_build_object(
      'icp_fit', r.icp_weight, 'intent', r.intent_weight,
      'engagement', r.engagement_weight, 'data_confidence', r.confidence_weight),
    'contributions', jsonb_build_object(
      'icp_fit', ROUND((icp * r.icp_weight)::numeric / wsum, 1),
      'intent', ROUND((intent * r.intent_weight)::numeric / wsum, 1),
      'engagement', ROUND((engagement * r.engagement_weight)::numeric / wsum, 1),
      'data_confidence', ROUND((confidence * r.confidence_weight)::numeric / wsum, 1)),
    'reasons', to_jsonb(reasons),
    'thresholds', jsonb_build_object('mql', r.mql_threshold, 'sql', r.sql_threshold),
    'scored_at', now()
  );

  IF NEW.status = 'new' AND total >= r.mql_threshold THEN NEW.status := 'mql'; END IF;
  IF NEW.status IN ('new','mql') AND total >= r.sql_threshold THEN NEW.status := 'sql'; END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.score_lead() FROM anon, authenticated;

-- Re-run scoring for a whole workspace after rules change
CREATE OR REPLACE FUNCTION public.recompute_workspace_scores(_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','manager']::workspace_role[]) THEN
    RAISE EXCEPTION 'Not allowed to rescore this workspace';
  END IF;
  UPDATE public.leads SET updated_at = now() WHERE workspace_id = _workspace_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.recompute_workspace_scores(uuid) TO authenticated;