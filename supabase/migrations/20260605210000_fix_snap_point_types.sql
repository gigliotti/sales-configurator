-- ============================================
-- Migration: Fix snap point column types and constraints in line_components
-- ============================================

BEGIN;

-- Drop foreign key constraints pointing to connection_points
ALTER TABLE public.line_components 
  DROP CONSTRAINT IF EXISTS line_components_parent_snap_point_id_fkey;

ALTER TABLE public.line_components 
  DROP CONSTRAINT IF EXISTS line_components_child_snap_point_id_fkey;

-- Alter column types from UUID to VARCHAR(255) to support string identifiers
ALTER TABLE public.line_components 
  ALTER COLUMN parent_snap_point_id TYPE VARCHAR(255);

ALTER TABLE public.line_components 
  ALTER COLUMN child_snap_point_id TYPE VARCHAR(255);

COMMIT;
