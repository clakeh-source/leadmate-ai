-- ============ ENUMS ============
CREATE TYPE public.workspace_role AS ENUM ('owner','admin','manager','sales_rep','viewer');
CREATE TYPE public.email_queue_status AS ENUM ('draft','pending_approval','queued','processing','sent','failed','cancelled','suppressed');
CREATE TYPE public.email_event_type AS ENUM ('queued','sent','delivered','opened','clicked','replied','bounced','complained','unsubscribed','failed');
CREATE TYPE public.suppression_reason AS ENUM ('unsubscribe','hard_bounce','spam_complaint','manual_block','legal_restriction');
CREATE TYPE public.consent_status AS ENUM ('granted','withdrawn','pending','not_required');
CREATE TYPE public.lawful_basis AS ENUM ('consent','legitimate_interest','contract','legal_obligation');

-- ============ WORKSPACES ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  timezone text NOT NULL DEFAULT 'UTC',
  daily_email_limit integer NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'sales_rep',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
CREATE INDEX idx_ws_members_user ON public.workspace_members(user_id, status);

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid() AND m.status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _roles public.workspace_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid()
      AND m.status = 'active' AND m.role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id FROM public.workspace_members m
  WHERE m.user_id = auth.uid() AND m.status = 'active'
$$;

REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, public.workspace_role[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_workspace_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, public.workspace_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_workspace_ids() TO authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read workspace" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));
CREATE POLICY "Users create workspace" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners admins update workspace" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "Owners delete workspace" ON public.workspaces FOR DELETE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner']::public.workspace_role[]));

CREATE POLICY "Members read membership" ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));
CREATE POLICY "Admins manage membership" ON public.workspace_members FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]));

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BACKFILL DEFAULT WORKSPACE ============
INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default Workspace', 'default', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1));

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT '00000000-0000-4000-8000-000000000001', u.id, 'owner' FROM auth.users u
ON CONFLICT DO NOTHING;

-- ============ LEADS: tenancy + dedupe + compliance columns ============
ALTER TABLE public.leads
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN normalized_email text,
  ADD COLUMN normalized_phone text,
  ADD COLUMN company_domain text,
  ADD COLUMN linkedin_url text,
  ADD COLUMN source_record_id text,
  ADD COLUMN source_url text,
  ADD COLUMN utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN first_touch_at timestamptz DEFAULT now(),
  ADD COLUMN last_touch_at timestamptz DEFAULT now();

UPDATE public.leads SET workspace_id = '00000000-0000-4000-8000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.leads SET normalized_email = lower(trim(email)),
  company_domain = lower(split_part(email,'@',2)) WHERE normalized_email IS NULL;
ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_lead()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.normalized_email := lower(trim(NEW.email));
  NEW.normalized_phone := NULLIF(regexp_replace(COALESCE(NEW.phone,''), '[^0-9]', '', 'g'), '');
  NEW.company_domain := COALESCE(NEW.company_domain, lower(split_part(NEW.email,'@',2)));
  NEW.last_touch_at := now();
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.normalize_lead() FROM PUBLIC;
CREATE TRIGGER leads_normalize BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_lead();

CREATE UNIQUE INDEX idx_leads_ws_email ON public.leads(workspace_id, normalized_email);
CREATE INDEX idx_leads_ws_created ON public.leads(workspace_id, created_at DESC);
CREATE INDEX idx_leads_ws_status ON public.leads(workspace_id, status);
CREATE INDEX idx_leads_ws_score ON public.leads(workspace_id, score DESC);
CREATE INDEX idx_leads_ws_domain ON public.leads(workspace_id, company_domain);
CREATE INDEX idx_leads_ws_owner ON public.leads(workspace_id, owner_id);

DROP POLICY IF EXISTS "Team can read leads" ON public.leads;
DROP POLICY IF EXISTS "Team can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Team can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Public can submit leads" ON public.leads;

CREATE POLICY "Members read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));
CREATE POLICY "Members update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));
CREATE POLICY "Managers delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]));

-- ============ LEAD ACTIVITIES / EMAILS: tenancy ============
ALTER TABLE public.lead_activities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
UPDATE public.lead_activities a SET workspace_id = l.workspace_id FROM public.leads l WHERE l.id = a.lead_id;
ALTER TABLE public.lead_activities ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX idx_activities_ws_lead ON public.lead_activities(workspace_id, lead_id, created_at DESC);

DROP POLICY IF EXISTS "Team can read activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Team can add activities" ON public.lead_activities;
CREATE POLICY "Members read activities" ON public.lead_activities FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members add activities" ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));

ALTER TABLE public.lead_emails ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
UPDATE public.lead_emails e SET workspace_id = l.workspace_id FROM public.leads l WHERE l.id = e.lead_id;
ALTER TABLE public.lead_emails ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX idx_lead_emails_ws_msg ON public.lead_emails(workspace_id, provider_message_id);

DROP POLICY IF EXISTS "Team can read lead emails" ON public.lead_emails;
DROP POLICY IF EXISTS "Team can insert lead emails" ON public.lead_emails;
CREATE POLICY "Members read lead emails" ON public.lead_emails FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members insert lead emails" ON public.lead_emails FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));

-- ============ SUPPRESSION LIST ============
CREATE TABLE public.suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason public.suppression_reason NOT NULL,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (workspace_id, email, reason)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppression_list TO authenticated;
GRANT ALL ON public.suppression_list TO service_role;
CREATE INDEX idx_suppression_ws_email ON public.suppression_list(workspace_id, email);
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read suppression" ON public.suppression_list FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Managers manage suppression" ON public.suppression_list FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]));

-- ============ LEAD CONSENTS ============
CREATE TABLE public.lead_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_type text NOT NULL DEFAULT 'marketing_email',
  lawful_basis public.lawful_basis NOT NULL DEFAULT 'consent',
  consent_status public.consent_status NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'website_form',
  consent_text_version text NOT NULL DEFAULT 'v1',
  captured_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.lead_consents TO authenticated;
GRANT ALL ON public.lead_consents TO service_role;
CREATE INDEX idx_consents_ws_lead ON public.lead_consents(workspace_id, lead_id, captured_at DESC);
ALTER TABLE public.lead_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read consents" ON public.lead_consents FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members write consents" ON public.lead_consents FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));
CREATE POLICY "Managers update consents" ON public.lead_consents FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]));

-- ============ EMAIL QUEUE ============
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid,
  sequence_id uuid,
  sequence_step_id uuid,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  status public.email_queue_status NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  idempotency_key text NOT NULL,
  last_error_code text,
  last_error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
GRANT SELECT, INSERT, UPDATE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
CREATE INDEX idx_queue_due ON public.email_queue(status, scheduled_at) WHERE status IN ('queued','failed');
CREATE INDEX idx_queue_ws_status ON public.email_queue(workspace_id, status, created_at DESC);
CREATE INDEX idx_queue_provider_msg ON public.email_queue(provider_message_id);
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read queue" ON public.email_queue FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members insert queue" ON public.email_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::public.workspace_role[]));
CREATE POLICY "Managers update queue" ON public.email_queue FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::public.workspace_role[]));
CREATE TRIGGER email_queue_updated_at BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EMAIL EVENTS ============
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_queue_id uuid REFERENCES public.email_queue(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  provider_event_id text,
  event_type public.email_event_type NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;
CREATE UNIQUE INDEX idx_email_events_provider_unique ON public.email_events(provider_event_id, event_type)
  WHERE provider_event_id IS NOT NULL;
CREATE INDEX idx_email_events_ws ON public.email_events(workspace_id, occurred_at DESC);
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read email events" ON public.email_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- ============ NEW USER -> OWN WORKSPACE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rep') ON CONFLICT DO NOTHING;

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)) || '''s Workspace',
          'ws-' || replace(NEW.id::text, '-', ''), NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;