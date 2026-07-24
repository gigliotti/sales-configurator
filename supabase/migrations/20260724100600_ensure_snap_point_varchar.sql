-- ============================================================================
-- Migración 20260724100600: Asegurar tipo VARCHAR de los snap points
-- ============================================================================
-- La migración 20260605210000 cambió parent/child_snap_point_id de UUID (FK a
-- connection_points) a VARCHAR(255) para admitir identificadores sintéticos
-- ('snap-pt-conveyor-in'). En entornos donde el esquema se cargó a mano, esa
-- migración puede no haberse ejecutado: sin ella, save_project_atomic y el
-- guardado legado fallarían al insertar strings. Todas las operaciones de este
-- archivo son idempotentes (re-aplicarlas sobre un esquema ya corregido es
-- inocuo).
-- ============================================================================

BEGIN;

ALTER TABLE public.line_components
  DROP CONSTRAINT IF EXISTS line_components_parent_snap_point_id_fkey;

ALTER TABLE public.line_components
  DROP CONSTRAINT IF EXISTS line_components_child_snap_point_id_fkey;

ALTER TABLE public.line_components
  ALTER COLUMN parent_snap_point_id TYPE VARCHAR(255)
  USING parent_snap_point_id::text;

ALTER TABLE public.line_components
  ALTER COLUMN child_snap_point_id TYPE VARCHAR(255)
  USING child_snap_point_id::text;

COMMIT;
