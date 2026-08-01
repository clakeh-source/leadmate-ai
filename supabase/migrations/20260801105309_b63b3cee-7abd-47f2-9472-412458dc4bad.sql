
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','manager','rep');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','mql','sql','meeting','won','lost');
CREATE TYPE public.lead_source AS ENUM ('website_form','chatbot','webinar','referral','paid_ads','outbound','other');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  job_title text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  phone text,
  company text,
  company_size text,
  country text,
  job_title text,
  source public.lead_source NOT NULL DEFAULT 'website_form',
  status public.lead_status NOT NULL DEFAULT 'new',
  score integer NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  consent_ip text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  estimated_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Team can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update leads" ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Activities
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON public.lead_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read activities" ON public.lead_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can add activities" ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Scoring engine
CREATE OR REPLACE FUNCTION public.score_lead()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  s integer := 0;
  size_pts integer := 0;
  email_pts integer := 0;
  source_pts integer := 0;
  intent_pts integer := 0;
  domain text;
BEGIN
  size_pts := CASE
    WHEN NEW.company_size ~* '1000|5000|enterprise' THEN 30
    WHEN NEW.company_size ~* '200|500' THEN 24
    WHEN NEW.company_size ~* '50' THEN 18
    WHEN NEW.company_size ~* '10' THEN 10
    ELSE 5 END;

  domain := lower(split_part(NEW.email, '@', 2));
  email_pts := CASE WHEN domain IN ('gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','proton.me') THEN 5 ELSE 25 END;

  source_pts := CASE NEW.source
    WHEN 'referral' THEN 25
    WHEN 'website_form' THEN 20
    WHEN 'chatbot' THEN 18
    WHEN 'webinar' THEN 15
    WHEN 'paid_ads' THEN 10
    WHEN 'outbound' THEN 8
    ELSE 5 END;

  intent_pts := 0;
  IF NEW.notes IS NOT NULL THEN
    intent_pts := intent_pts + LEAST(10, length(NEW.notes) / 40);
    IF NEW.notes ~* 'pricing|demo|budget|buy|urgent|evaluat' THEN intent_pts := intent_pts + 8; END IF;
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 5 THEN intent_pts := intent_pts + 4; END IF;
  IF NEW.marketing_consent THEN intent_pts := intent_pts + 3; END IF;

  s := LEAST(100, size_pts + email_pts + source_pts + intent_pts);
  NEW.score := s;
  NEW.score_breakdown := jsonb_build_object(
    'company_size', size_pts, 'email_quality', email_pts, 'source', source_pts, 'intent', intent_pts
  );
  IF NEW.status = 'new' AND s >= 70 THEN NEW.status := 'mql'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER leads_scoring BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.score_lead();

-- Profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rep') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
