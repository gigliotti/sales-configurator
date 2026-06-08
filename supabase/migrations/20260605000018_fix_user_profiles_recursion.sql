-- ============================================
-- Migration 014: Fix User Profiles Recursion
-- ============================================
-- Fixes infinite recursion in the user_profiles_admin_all policy
-- by using the get_user_role() SECURITY DEFINER helper function
-- instead of a recursive subquery on user_profiles.
-- ============================================

BEGIN;

DROP POLICY IF EXISTS user_profiles_admin_all ON public.user_profiles;

CREATE POLICY user_profiles_admin_all
  ON public.user_profiles FOR ALL TO authenticated, anon
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

COMMIT;
