-- ============================================
-- Migration 013: Allow Seller Read All Projects
-- ============================================
-- Allows sellers and admins to select/read all projects,
-- project lines, components, and component options.
-- This enables searching other users' projects and favoriting them.
-- ============================================

BEGIN;

-- 1. Projects SELECT policy
DROP POLICY IF EXISTS projects_seller_select_all ON public.projects;
CREATE POLICY projects_seller_select_all
  ON public.projects FOR SELECT TO authenticated, anon
  USING (get_user_role() IN ('seller', 'admin'));

-- 2. Project Lines SELECT policy
DROP POLICY IF EXISTS project_lines_seller_select_all ON public.project_lines;
CREATE POLICY project_lines_seller_select_all
  ON public.project_lines FOR SELECT TO authenticated, anon
  USING (get_user_role() IN ('seller', 'admin'));

-- 3. Line Components SELECT policy
DROP POLICY IF EXISTS line_components_seller_select_all ON public.line_components;
CREATE POLICY line_components_seller_select_all
  ON public.line_components FOR SELECT TO authenticated, anon
  USING (get_user_role() IN ('seller', 'admin'));

-- 4. Line Component Options SELECT policy
DROP POLICY IF EXISTS line_component_options_seller_select_all ON public.line_component_options;
CREATE POLICY line_component_options_seller_select_all
  ON public.line_component_options FOR SELECT TO authenticated, anon
  USING (get_user_role() IN ('seller', 'admin'));

COMMIT;
