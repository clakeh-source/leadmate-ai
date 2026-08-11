-- Phase 3: campaigns, sequences, enrollments, imports, enrichment

CREATE TYPE public.campaign_status AS ENUM ('draft','active','paused','completed','archived');
CREATE TYPE public.enrollment_status AS ENUM ('active','paused','completed','stopped','failed');

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  goal text NOT NULL DEFAULT 'book_meeting',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read campaigns" ON public.campaigns FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Managers write campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers update campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[])) WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));

CREATE TABLE public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  stop_on_reply boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequences TO authenticated;
GRANT ALL ON public.sequences TO service_role;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sequences" ON public.sequences FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Managers write sequences" ON public.sequences FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers update sequences" ON public.sequences FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[])) WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers delete sequences" ON public.sequences FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));

CREATE TABLE public.sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  wait_hours integer NOT NULL DEFAULT 48,
  goal text NOT NULL DEFAULT 'follow_up',
  tone text NOT NULL DEFAULT 'consultative',
  subject_template text,
  body_template text,
  use_ai boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_steps TO authenticated;
GRANT ALL ON public.sequence_steps TO service_role;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read steps" ON public.sequence_steps FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Managers write steps" ON public.sequence_steps FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers update steps" ON public.sequence_steps FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[])) WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));
CREATE POLICY "Managers delete steps" ON public.sequence_steps FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));

CREATE TABLE public.sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  enrolled_by uuid REFERENCES auth.users(id),
  status public.enrollment_status NOT NULL DEFAULT 'active',
  current_step integer NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_enrollments TO authenticated;
GRANT ALL ON public.sequence_enrollments TO service_role;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read enrollments" ON public.sequence_enrollments FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members write enrollments" ON public.sequence_enrollments FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::workspace_role[]));
CREATE POLICY "Members update enrollments" ON public.sequence_enrollments FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::workspace_role[])) WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::workspace_role[]));
CREATE POLICY "Managers delete enrollments" ON public.sequence_enrollments FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager']::workspace_role[]));

CREATE TABLE public.lead_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  filename text,
  total_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_imports TO authenticated;
GRANT ALL ON public.lead_imports TO service_role;
ALTER TABLE public.lead_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read imports" ON public.lead_imports FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members create imports" ON public.lead_imports FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','manager','sales_rep']::workspace_role[]));

-- Enrichment fields on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS enrichment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Link queue rows to campaigns/sequences (columns already exist) for reporting
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign ON public.email_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_due ON public.sequence_enrollments(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_sequences_workspace ON public.sequences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_steps_sequence ON public.sequence_steps(sequence_id, step_order);

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sequences_updated_at BEFORE UPDATE ON public.sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.sequence_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();