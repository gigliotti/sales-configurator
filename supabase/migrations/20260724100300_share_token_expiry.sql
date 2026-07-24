-- ============================================================================
-- Migración 20260724100300: Expiración y gestión de share tokens
-- ============================================================================
-- 1. Nueva columna projects.share_token_expires_at (NULL = sin expiración,
--    retrocompatible con los tokens existentes).
-- 2. Las políticas de lectura por share token pasan a exigir que el token no
--    haya expirado. De paso se CONSOLIDAN las variantes duplicadas
--    (anon/client/share de 008 y 20260605200000) en una sola política
--    *_share_select por tabla, para authenticated + anon.
-- 3. RPCs de gestión: regenerate_share_token() y revoke_share_token(),
--    ejecutables solo por el dueño del proyecto o un admin.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────
-- § 0  Dependencia defensiva
-- ────────────────────────────────────────────
-- get_x_share_token() se definió en 20260605200000, pero en entornos donde el
-- esquema se cargó a mano por el SQL Editor esa migración puede no haberse
-- ejecutado nunca (el historial se reparó a posteriori). Se (re)crea aquí para
-- que esta migración sea autosuficiente.
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

-- ────────────────────────────────────────────
-- § 1  Columna de expiración
-- ────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.share_token_expires_at IS
  'Momento en que el share_token deja de ser válido. NULL = sin expiración.';

-- ────────────────────────────────────────────
-- § 2  Políticas de share token con expiración
-- ────────────────────────────────────────────
-- Condición común: token presente, coincidente con el header x-share-token
-- (vía get_x_share_token(), migración 20260605200000) y no expirado.

-- PROJECTS: se consolidan las dos variantes de 008 en una sola política.
DROP POLICY IF EXISTS projects_anon_read_shared   ON public.projects;  -- (008, anon)
DROP POLICY IF EXISTS projects_client_read_shared ON public.projects;  -- (008, client)
DROP POLICY IF EXISTS projects_share_select       ON public.projects;
CREATE POLICY projects_share_select
  ON public.projects FOR SELECT TO authenticated, anon
  USING (
    share_token IS NOT NULL
    AND share_token = public.get_x_share_token()
    AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  );

-- PROJECT_LINES: ídem.
DROP POLICY IF EXISTS project_lines_anon_read_shared   ON public.project_lines;  -- (008, anon)
DROP POLICY IF EXISTS project_lines_client_read_shared ON public.project_lines;  -- (008, client)
DROP POLICY IF EXISTS project_lines_share_select       ON public.project_lines;
CREATE POLICY project_lines_share_select
  ON public.project_lines FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lines.project_id
        AND p.share_token IS NOT NULL
        AND p.share_token = public.get_x_share_token()
        AND (p.share_token_expires_at IS NULL OR p.share_token_expires_at > now())
    )
  );

-- LINE_COMPONENTS: absorbe la variante client de 008 y la share de 200000.
DROP POLICY IF EXISTS line_components_client_read_shared ON public.line_components;  -- (008, client)
DROP POLICY IF EXISTS line_components_share_select       ON public.line_components;  -- (20260605200000)
CREATE POLICY line_components_share_select
  ON public.line_components FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.project_lines pl
      JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id
        AND p.share_token IS NOT NULL
        AND p.share_token = public.get_x_share_token()
        AND (p.share_token_expires_at IS NULL OR p.share_token_expires_at > now())
    )
  );

-- LINE_COMPONENT_OPTIONS: recreada desde 20260605200000 con expiración.
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
        AND (p.share_token_expires_at IS NULL OR p.share_token_expires_at > now())
    )
  );

-- ────────────────────────────────────────────
-- § 3  RPCs de gestión del token
-- ────────────────────────────────────────────

-- Regenera el share_token de un proyecto y fija (opcionalmente) su
-- expiración. Solo el dueño o un admin. SECURITY DEFINER con verificación
-- explícita de permisos sobre auth.uid().
CREATE OR REPLACE FUNCTION public.regenerate_share_token(
  p_project_id uuid,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'regenerate_share_token requiere una sesión autenticada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (p.owner_id = auth.uid() OR get_user_role() = 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo el dueño del proyecto o un administrador pueden regenerar el share token';
  END IF;

  v_token := gen_random_uuid()::text;  -- share_token es VARCHAR(64)

  UPDATE projects
  SET share_token            = v_token,
      share_token_expires_at = p_expires_at,
      updated_at             = now()
  WHERE id = p_project_id;

  RETURN v_token;
END;
$$;

-- Revoca el share_token: los enlaces compartidos dejan de funcionar.
CREATE OR REPLACE FUNCTION public.revoke_share_token(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'revoke_share_token requiere una sesión autenticada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (p.owner_id = auth.uid() OR get_user_role() = 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo el dueño del proyecto o un administrador pueden revocar el share token';
  END IF;

  UPDATE projects
  SET share_token            = NULL,
      share_token_expires_at = NULL,
      updated_at             = now()
  WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_share_token(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_share_token(uuid, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.regenerate_share_token(uuid, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_share_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_share_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_share_token(uuid) TO authenticated;

COMMIT;
