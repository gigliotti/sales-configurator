-- ============================================================================
-- Migración 20260724100000: Eliminar suplantación por header x-active-profile-id
-- ============================================================================
-- El mecanismo de "mock login" (migraciones 014/015/016/017 y
-- 20260605194718) permitía que un cliente sin autenticar (rol anon) actuara
-- como cualquier perfil simplemente enviando el header x-active-profile-id.
-- Esta migración elimina ese bypass por completo:
--
--   1. get_active_profile_id() pasa a devolver únicamente auth.uid()
--      (se conserva la función porque políticas y triggers la referencian).
--   2. Todas las políticas que concedían acceso al rol "anon" en base a ese
--      header se recrean exigiendo "authenticated" + auth.uid().
--   3. Se MANTIENEN sin cambios:
--        - Lectura anónima del catálogo y traducciones (migración 013),
--          necesaria para el modo invitado del configurador.
--        - Políticas de share token (x-share-token): son de solo lectura
--          por diseño y se endurecen con expiración en 20260724100300.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────
-- § 1  Funciones auxiliares
-- ────────────────────────────────────────────

-- get_active_profile_id: ya NO lee request.headers. Identidad = auth.uid().
-- Se conserva la firma para no romper objetos dependientes.
CREATE OR REPLACE FUNCTION public.get_active_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_active_profile_id() TO PUBLIC;

-- get_user_role: deriva el rol exclusivamente de auth.uid().
-- SECURITY DEFINER para leer user_profiles sin recursión de RLS.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS varchar(20)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

-- prevent_role_escalation: el chequeo de admin ahora usa auth.uid() directo.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────
-- § 2  USER_PROFILES
-- ────────────────────────────────────────────

-- (015) Permitía a cualquiera, incluso anon, listar TODOS los perfiles.
-- Solo existía para el selector de perfiles del mock login: se elimina.
DROP POLICY IF EXISTS user_profiles_read_all ON public.user_profiles;

-- Lectura del propio perfil (restituye la política original de 008).
DROP POLICY IF EXISTS user_profiles_read_own ON public.user_profiles;
CREATE POLICY user_profiles_read_own
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Vendedores/admins autenticados pueden leer perfiles para mostrar el
-- nombre del dueño en el listado global de proyectos (política 017).
-- Sin acceso para anon.
DROP POLICY IF EXISTS user_profiles_read_by_sellers ON public.user_profiles;
CREATE POLICY user_profiles_read_by_sellers
  ON public.user_profiles FOR SELECT TO authenticated
  USING (get_user_role() IN ('seller', 'admin'));

-- (016/018) Concedía ALL a anon si el header apuntaba a un admin.
DROP POLICY IF EXISTS user_profiles_admin_all ON public.user_profiles;
CREATE POLICY user_profiles_admin_all
  ON public.user_profiles FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- (016) Permitía a anon actualizar el perfil apuntado por el header.
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY user_profiles_update_own
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────
-- § 3  PROJECTS
-- ────────────────────────────────────────────

-- (016) CRUD para anon suplantando al dueño vía header.
DROP POLICY IF EXISTS projects_seller_all ON public.projects;
CREATE POLICY projects_seller_all
  ON public.projects FOR ALL TO authenticated
  USING (get_user_role() IN ('seller', 'admin') AND owner_id = auth.uid())
  WITH CHECK (get_user_role() IN ('seller', 'admin') AND owner_id = auth.uid());

-- (017) SELECT global también abierto a anon.
DROP POLICY IF EXISTS projects_seller_select_all ON public.projects;
CREATE POLICY projects_seller_select_all
  ON public.projects FOR SELECT TO authenticated
  USING (get_user_role() IN ('seller', 'admin'));

-- ────────────────────────────────────────────
-- § 4  PROJECT_LINES
-- ────────────────────────────────────────────

-- (016) CRUD para anon vía header.
DROP POLICY IF EXISTS project_lines_seller_all ON public.project_lines;
CREATE POLICY project_lines_seller_all
  ON public.project_lines FOR ALL TO authenticated
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lines.project_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lines.project_id AND p.owner_id = auth.uid()
    )
  );

-- (017) SELECT global también abierto a anon.
DROP POLICY IF EXISTS project_lines_seller_select_all ON public.project_lines;
CREATE POLICY project_lines_seller_select_all
  ON public.project_lines FOR SELECT TO authenticated
  USING (get_user_role() IN ('seller', 'admin'));

-- ────────────────────────────────────────────
-- § 5  LINE_COMPONENTS
-- ────────────────────────────────────────────

-- (016) CRUD para anon vía header.
DROP POLICY IF EXISTS line_components_seller_all ON public.line_components;
CREATE POLICY line_components_seller_all
  ON public.line_components FOR ALL TO authenticated
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.project_lines pl
      JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.project_lines pl
      JOIN public.projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = auth.uid()
    )
  );

-- (017) SELECT global también abierto a anon.
DROP POLICY IF EXISTS line_components_seller_select_all ON public.line_components;
CREATE POLICY line_components_seller_select_all
  ON public.line_components FOR SELECT TO authenticated
  USING (get_user_role() IN ('seller', 'admin'));

-- ────────────────────────────────────────────
-- § 6  LINE_COMPONENT_OPTIONS
-- ────────────────────────────────────────────

-- (016) CRUD para anon vía header.
DROP POLICY IF EXISTS line_component_options_seller_all ON public.line_component_options;
CREATE POLICY line_component_options_seller_all
  ON public.line_component_options FOR ALL TO authenticated
  USING (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.line_components lc
      JOIN public.project_lines pl ON pl.id = lc.line_id
      JOIN public.projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() IN ('seller', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.line_components lc
      JOIN public.project_lines pl ON pl.id = lc.line_id
      JOIN public.projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = auth.uid()
    )
  );

-- (017) SELECT global también abierto a anon.
DROP POLICY IF EXISTS line_component_options_seller_select_all ON public.line_component_options;
CREATE POLICY line_component_options_seller_select_all
  ON public.line_component_options FOR SELECT TO authenticated
  USING (get_user_role() IN ('seller', 'admin'));

-- ────────────────────────────────────────────
-- § 7  SELLER_FAVORITE_PROJECTS
-- ────────────────────────────────────────────

-- (016) CRUD para anon vía header.
DROP POLICY IF EXISTS seller_favorite_projects_seller_all ON public.seller_favorite_projects;
CREATE POLICY seller_favorite_projects_seller_all
  ON public.seller_favorite_projects FOR ALL TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- (014) Lectura de favoritos abierta a anon: innecesaria sin mock login.
DROP POLICY IF EXISTS seller_favorite_projects_anon_read ON public.seller_favorite_projects;

COMMIT;
