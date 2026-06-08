-- ============================================
-- Migration 009_5: Fix Wrapper Configuration Check Constraint
-- ============================================
-- The original constraint was missing 'SUSR' and 'CULR' which are
-- used in the catalog seed data.
-- ============================================

ALTER TABLE wrapper_configurations
  DROP CONSTRAINT IF EXISTS wrapper_configurations_cut_and_seal_check;

ALTER TABLE wrapper_configurations
  ADD CONSTRAINT wrapper_configurations_cut_and_seal_check
  CHECK (cut_and_seal IN ('CU', 'SU', 'CUSR', 'SUSR', 'CULR', 'SULR', 'NONE'));
