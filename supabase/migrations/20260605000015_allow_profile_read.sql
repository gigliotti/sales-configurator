-- ============================================
-- Migration 015: Allow Profile Read
-- ============================================
-- Allow anonymous and authenticated users to read profiles
-- so they can switch sessions in the testing dropdown lobby.
-- ============================================

BEGIN;

DROP POLICY IF EXISTS user_profiles_read_own ON public.user_profiles;

CREATE POLICY user_profiles_read_all
  ON public.user_profiles FOR SELECT TO authenticated, anon
  USING (true);

COMMIT;
