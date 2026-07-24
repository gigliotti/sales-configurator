-- ============================================================================
-- Migración 20260724100400: Soft delete, estados de proyecto e índices
-- ============================================================================
-- 1. projects.deleted_at (NULL = activo) + índice parcial para listados.
-- 2. CHECK de status ampliado: el CHECK original inline de la migración 006
--    era status IN ('draft','shared','approved','archived').
--    Como pueden existir filas con los valores legados 'shared'/'archived',
--    el nuevo CHECK acepta la UNIÓN de valores nuevos y legados en lugar de
--    solo los nuevos (un CHECK estricto rompería datos existentes).
-- 3. RPCs soft_delete_project() / restore_project() (dueño o admin).
-- 4. Índices de soporte para los patrones de consulta más comunes.
--    (El filtrado de proyectos borrados se hace en el cliente; no se
--    modifican políticas RLS de listado.)
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────
-- § 1  Soft delete
-- ────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.deleted_at IS
  'Borrado lógico: NULL = proyecto activo. Se restaura poniéndolo a NULL.';

-- Índice parcial: cubre el listado habitual "proyectos activos del vendedor
-- ordenados por última modificación".
CREATE INDEX IF NOT EXISTS idx_projects_active
  ON public.projects (owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────
-- § 2  CHECK de status
-- ────────────────────────────────────────────
-- Se reemplaza el CHECK inline original (creado con nombre automático
-- projects_status_check en la migración 006) por uno que admite los estados
-- nuevos ('sent','rejected') y conserva los legados ('shared','archived')
-- para no invalidar filas existentes.

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'shared', 'archived'));

-- ────────────────────────────────────────────
-- § 3  RPCs de borrado lógico
-- ────────────────────────────────────────────

-- Marca un proyecto como borrado. Solo dueño o admin.
CREATE OR REPLACE FUNCTION public.soft_delete_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'soft_delete_project requiere una sesión autenticada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (p.owner_id = auth.uid() OR get_user_role() = 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo el dueño del proyecto o un administrador pueden borrarlo';
  END IF;

  UPDATE projects
  SET deleted_at = now(),
      updated_at = now()
  WHERE id = p_project_id
    AND deleted_at IS NULL;  -- idempotente: no re-marca borrados
END;
$$;

-- Restaura un proyecto borrado lógicamente. Solo dueño o admin.
CREATE OR REPLACE FUNCTION public.restore_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'restore_project requiere una sesión autenticada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (p.owner_id = auth.uid() OR get_user_role() = 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo el dueño del proyecto o un administrador pueden restaurarlo';
  END IF;

  UPDATE projects
  SET deleted_at = NULL,
      updated_at = now()
  WHERE id = p_project_id
    AND deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_project(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_project(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_project(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_project(uuid) TO authenticated;

-- ────────────────────────────────────────────
-- § 4  Índices de soporte
-- ────────────────────────────────────────────
-- Los índices de una sola columna sobre project_lines, line_components y
-- line_component_options ya existen desde la migración 006; se aseguran
-- aquí con IF NOT EXISTS por idempotencia.

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
  ON public.projects (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_lines_project
  ON public.project_lines (project_id);

CREATE INDEX IF NOT EXISTS idx_line_components_line
  ON public.line_components (line_id);

CREATE INDEX IF NOT EXISTS idx_line_component_options_lc
  ON public.line_component_options (line_component_id);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_version
  ON public.project_versions (project_id, version DESC);

COMMIT;
