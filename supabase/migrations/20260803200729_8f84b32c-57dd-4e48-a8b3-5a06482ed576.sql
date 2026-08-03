CREATE TABLE public.lead_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  provider_message_id text UNIQUE,
  status text NOT NULL DEFAULT 'sent',
  opened_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lead_emails TO authenticated;
GRANT ALL ON public.lead_emails TO service_role;

ALTER TABLE public.lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read lead emails" ON public.lead_emails
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert lead emails" ON public.lead_emails
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_lead_emails_lead_id ON public.lead_emails(lead_id);
CREATE INDEX idx_lead_emails_provider_message_id ON public.lead_emails(provider_message_id);

CREATE TRIGGER lead_emails_set_updated_at
  BEFORE UPDATE ON public.lead_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();