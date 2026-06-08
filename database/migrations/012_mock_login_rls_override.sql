-- ============================================
-- Migration 012: Mock Login RLS Override
-- ============================================
-- 1. Helper function to get active profile from custom header
-- 2. Update get_user_role helper
-- 3. Recreate RLS policies to allow anon role actions under the custom header
-- ============================================

BEGIN;

-- --------------------------------------------
-- 1. Helper Function
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_active_profile_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-active-profile-id', '')::uuid,
    auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_active_profile_id() TO PUBLIC;

-- --------------------------------------------
-- 2. Update get_user_role
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(20) AS $$
  SELECT role FROM user_profiles WHERE id = get_active_profile_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------
-- 3. Update RLS Policies
-- --------------------------------------------

-- § 3.1  USER_PROFILES
DROP POLICY IF EXISTS user_profiles_admin_all ON public.user_profiles;
CREATE POLICY user_profiles_admin_all
  ON public.user_profiles FOR ALL TO authenticated, anon
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = get_active_profile_id() AND up.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = get_active_profile_id() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY user_profiles_update_own
  ON public.user_profiles FOR UPDATE TO authenticated, anon
  USING (id = get_active_profile_id())
  WITH CHECK (id = get_active_profile_id());

-- § 3.2  PROJECTS
DROP POLICY IF EXISTS projects_seller_all ON public.projects;
CREATE POLICY projects_seller_all
  ON public.projects FOR ALL TO authenticated, anon
  USING (get_user_role() IN ('seller', 'admin') AND owner_id = get_active_profile_id())
  WITH CHECK (get_user_role() IN ('seller', 'admin') AND owner_id = get_active_profile_id());

-- § 3.3  PROJECT_LINES
DROP POLICY IF EXISTS project_lines_seller_all ON public.project_lines;
CREATE POLICY project_lines_seller_all
  ON public.project_lines FOR ALL TO authenticated, anon
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_lines.project_id AND p.owner_id = get_active_profile_id())
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_lines.project_id AND p.owner_id = get_active_profile_id())
  );

-- § 3.4  LINE_COMPONENTS
DROP POLICY IF EXISTS line_components_seller_all ON public.line_components;
CREATE POLICY line_components_seller_all
  ON public.line_components FOR ALL TO authenticated, anon
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.project_lines pl JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = get_active_profile_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.project_lines pl JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = get_active_profile_id()
    )
  );

-- § 3.5  LINE_COMPONENT_OPTIONS
DROP POLICY IF EXISTS line_component_options_seller_all ON public.line_component_options;
CREATE POLICY line_component_options_seller_all
  ON public.line_component_options FOR ALL TO authenticated, anon
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.line_components lc
      JOIN public.project_lines pl ON pl.id = lc.line_id
      JOIN public.projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = get_active_profile_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.line_components lc
      JOIN public.project_lines pl ON pl.id = lc.line_id
      JOIN public.projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = get_active_profile_id()
    )
  );

-- § 3.6  SELLER_FAVORITE_PROJECTS
DROP POLICY IF EXISTS seller_favorite_projects_seller_all ON public.seller_favorite_projects;
CREATE POLICY seller_favorite_projects_seller_all
  ON public.seller_favorite_projects FOR ALL TO authenticated, anon
  USING (seller_id = get_active_profile_id())
  WITH CHECK (seller_id = get_active_profile_id());

COMMIT;
