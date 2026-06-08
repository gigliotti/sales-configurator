-- ============================================
-- Migration: Fixing Adversarial Vulnerabilities & RLS Gaps
-- ============================================

BEGIN;

-- 1. Helper function to safely extract x-share-token header
CREATE OR REPLACE FUNCTION public.get_x_share_token()
RETURNS TEXT AS $$
DECLARE
  v_header_val TEXT;
BEGIN
  BEGIN
    v_header_val := current_setting('request.headers', true)::json->>'x-share-token';
  EXCEPTION WHEN OTHERS THEN
    v_header_val := NULL;
  END;
  RETURN NULLIF(v_header_val, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_x_share_token() TO public;

-- 2. Line Components SELECT policy for share token access (authenticated and anon)
DROP POLICY IF EXISTS line_components_share_select ON public.line_components;
CREATE POLICY line_components_share_select
  ON public.line_components FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.project_lines pl
      JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id
        AND p.share_token IS NOT NULL
        AND p.share_token = public.get_x_share_token()
    )
  );

-- 3. Line Component Options SELECT policy for share token access (authenticated and anon)
DROP POLICY IF EXISTS line_component_options_share_select ON public.line_component_options;
CREATE POLICY line_component_options_share_select
  ON public.line_component_options FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.line_components lc
      JOIN public.project_lines pl ON pl.id = lc.line_id
      JOIN public.projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.share_token IS NOT NULL
        AND p.share_token = public.get_x_share_token()
    )
  );

-- 4. Trigger to prevent privilege escalation on user_profiles role update
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = public.get_active_profile_id() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_role_escalation ON public.user_profiles;
CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

COMMIT;
