-- ============================================================================
-- Migración 20260724100100: RPC atómica de guardado de proyectos
-- ============================================================================
-- save_project_atomic(payload jsonb) reemplaza la cascada de llamadas del
-- frontend (upsert proyecto + delete/insert de líneas, componentes, opciones
-- y versión) por una única función transaccional.
--
--   - SECURITY INVOKER: se ejecuta con los permisos del usuario llamante,
--     por lo que RLS sigue decidiendo qué proyectos puede tocar.
--   - Toda la función corre dentro de una transacción: si algo falla,
--     no queda ningún estado intermedio.
--
-- Estructura esperada del payload:
-- {
--   "project":  { id?, name, client_name, client_email, total_price_eur, status },
--   "lines":    [ { name, product_type_id, ..., line_price_eur,
--                   components: [ { component_id, pos_x, pos_y, pos_z, rot_y,
--                                   client_uuid, connected_to_client_uuid,
--                                   parent_snap_point_id,
--                                   options: [ { option_type, option_id } ] } ] } ],
--   "snapshot": { ... }   -- snapshot completo para project_versions
-- }
--
-- Devuelve: { "project_id": uuid, "share_token": text, "version": int }
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.save_project_atomic(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project     jsonb := payload -> 'project';
  v_lines       jsonb := COALESCE(payload -> 'lines', '[]'::jsonb);
  v_project_id  uuid;
  v_share_token text;
  v_version     int;

  v_line     jsonb;
  v_line_ord bigint;
  v_line_id  uuid;

  v_comp     jsonb;
  v_comp_ord bigint;
  v_comp_id  uuid;
  v_opt      jsonb;

  v_product_type_id   int;
  v_transport_type_id int;

  -- Mapeo client_uuid -> line_components.id, reiniciado por línea.
  v_id_map    jsonb;
  v_target_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'save_project_atomic requiere una sesión autenticada';
  END IF;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'payload->project es obligatorio';
  END IF;

  -- --------------------------------------------
  -- 1. Upsert del proyecto (RLS valida propiedad)
  -- --------------------------------------------
  IF NULLIF(v_project ->> 'id', '') IS NULL THEN
    -- share_token es VARCHAR(64): se guarda el uuid como texto.
    INSERT INTO projects (owner_id, name, client_name, client_email, status, share_token, total_price_eur)
    VALUES (
      auth.uid(),
      v_project ->> 'name',
      v_project ->> 'client_name',
      v_project ->> 'client_email',
      COALESCE(NULLIF(v_project ->> 'status', ''), 'draft'),
      gen_random_uuid()::text,
      COALESCE((v_project ->> 'total_price_eur')::numeric, 0)
    )
    RETURNING id, share_token INTO v_project_id, v_share_token;
  ELSE
    v_project_id := (v_project ->> 'id')::uuid;

    UPDATE projects SET
      name            = v_project ->> 'name',
      client_name     = v_project ->> 'client_name',
      client_email    = v_project ->> 'client_email',
      status          = COALESCE(NULLIF(v_project ->> 'status', ''), status),
      total_price_eur = COALESCE((v_project ->> 'total_price_eur')::numeric, total_price_eur),
      updated_at      = now()
    WHERE id = v_project_id
    RETURNING share_token INTO v_share_token;

    -- Con RLS, un proyecto ajeno es invisible: UPDATE afecta 0 filas.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proyecto % inexistente o sin permisos', v_project_id;
    END IF;

    -- 2. Borrar líneas anteriores (ON DELETE CASCADE arrastra
    --    line_components y line_component_options).
    DELETE FROM project_lines WHERE project_id = v_project_id;
  END IF;

  -- --------------------------------------------
  -- 3. Insertar líneas, componentes y opciones
  -- --------------------------------------------
  FOR v_line, v_line_ord IN
    SELECT value, ordinality
    FROM jsonb_array_elements(v_lines) WITH ORDINALITY
  LOOP
    -- El cliente puede enviar ids numéricos o nombres ('CAJA'/'BOLSA',
    -- 'RODILLO'/'CADENA'); se resuelven aquí contra las tablas lookup.
    v_product_type_id := NULLIF(v_line ->> 'product_type_id', '')::int;
    IF v_product_type_id IS NULL THEN
      SELECT id INTO v_product_type_id
      FROM product_types WHERE name = v_line ->> 'product_type';
    END IF;
    v_product_type_id := COALESCE(v_product_type_id, 1);

    v_transport_type_id := NULLIF(v_line ->> 'transport_type_id', '')::int;
    IF v_transport_type_id IS NULL AND NULLIF(v_line ->> 'transport_type', '') IS NOT NULL THEN
      SELECT id INTO v_transport_type_id
      FROM transport_types WHERE name = v_line ->> 'transport_type';
    END IF;
    IF v_transport_type_id IS NULL THEN
      SELECT id INTO v_transport_type_id FROM transport_types WHERE name = 'NONE';
    END IF;

    INSERT INTO project_lines (
      project_id, name, sort_order,
      product_type_id, product_length_mm, product_width_mm, product_height_mm,
      product_weight_kg, desired_speed_upm,
      pallet_length_mm, pallet_width_mm, units_per_layer, total_pallet_height_mm,
      preferred_wrap_type, max_budget_eur,
      palletizer_id, transport_type_id, line_price_eur
    ) VALUES (
      v_project_id,
      v_line ->> 'name',
      (v_line_ord - 1)::int,
      v_product_type_id,
      (v_line ->> 'product_length_mm')::int,
      (v_line ->> 'product_width_mm')::int,
      (v_line ->> 'product_height_mm')::int,
      (v_line ->> 'product_weight_kg')::numeric,
      (v_line ->> 'desired_speed_upm')::int,
      (v_line ->> 'pallet_length_mm')::int,
      (v_line ->> 'pallet_width_mm')::int,
      (v_line ->> 'units_per_layer')::int,
      (v_line ->> 'total_pallet_height_mm')::int,
      NULLIF(v_line ->> 'preferred_wrap_type', ''),
      (v_line ->> 'max_budget_eur')::numeric,
      NULLIF(v_line ->> 'palletizer_id', '')::int,
      v_transport_type_id,
      COALESCE((v_line ->> 'line_price_eur')::numeric, 0)
    )
    RETURNING id INTO v_line_id;

    v_id_map := '{}'::jsonb;

    -- 3a. Primera pasada: insertar componentes (connected_to queda NULL)
    FOR v_comp, v_comp_ord IN
      SELECT value, ordinality
      FROM jsonb_array_elements(COALESCE(v_line -> 'components', '[]'::jsonb)) WITH ORDINALITY
    LOOP
      -- parent/child_snap_point_id son VARCHAR(255) desde la migración
      -- 20260605210000_fix_snap_point_types (identificadores sintéticos
      -- tipo 'snap-pt-conveyor-in'), NO uuid.
      INSERT INTO line_components (
        line_id, component_id,
        pos_x, pos_y, pos_z, rot_y,
        parent_snap_point_id, child_snap_point_id, sort_order
      ) VALUES (
        v_line_id,
        (v_comp ->> 'component_id')::int,
        COALESCE((v_comp ->> 'pos_x')::double precision, 0),
        COALESCE((v_comp ->> 'pos_y')::double precision, 0),
        COALESCE((v_comp ->> 'pos_z')::double precision, 0),
        COALESCE((v_comp ->> 'rot_y')::double precision, 0),
        NULLIF(v_comp ->> 'parent_snap_point_id', ''),
        NULLIF(v_comp ->> 'parent_snap_point_id', ''),
        (v_comp_ord - 1)::int
      )
      RETURNING id INTO v_comp_id;

      IF NULLIF(v_comp ->> 'client_uuid', '') IS NOT NULL THEN
        v_id_map := v_id_map || jsonb_build_object(v_comp ->> 'client_uuid', v_comp_id::text);
      END IF;

      -- 3b. Opciones / accesorios del componente
      FOR v_opt IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(v_comp -> 'options', '[]'::jsonb))
      LOOP
        INSERT INTO line_component_options (line_component_id, option_type, option_id)
        VALUES (v_comp_id, v_opt ->> 'option_type', (v_opt ->> 'option_id')::int);
      END LOOP;
    END LOOP;

    -- 3c. Segunda pasada: resolver connected_to vía client_uuid -> id real
    FOR v_comp IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_line -> 'components', '[]'::jsonb))
    LOOP
      IF NULLIF(v_comp ->> 'connected_to_client_uuid', '') IS NOT NULL THEN
        v_target_id := v_id_map ->> (v_comp ->> 'connected_to_client_uuid');
        IF v_target_id IS NULL THEN
          RAISE EXCEPTION 'connected_to_client_uuid % no corresponde a ningún componente de la línea',
            v_comp ->> 'connected_to_client_uuid';
        END IF;

        UPDATE line_components
        SET connected_to = v_target_id::uuid
        WHERE id = (v_id_map ->> (v_comp ->> 'client_uuid'))::uuid;
      END IF;
    END LOOP;
  END LOOP;

  -- --------------------------------------------
  -- 4. Snapshot de versión (número incremental por proyecto)
  -- --------------------------------------------
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_version
  FROM project_versions
  WHERE project_id = v_project_id;

  INSERT INTO project_versions (project_id, version, snapshot, created_by)
  VALUES (v_project_id, v_version, COALESCE(payload -> 'snapshot', '{}'::jsonb), auth.uid());

  RETURN jsonb_build_object(
    'project_id',  v_project_id,
    'share_token', v_share_token,
    'version',     v_version
  );
END;
$$;

-- Solo usuarios autenticados: el modo invitado no persiste proyectos.
REVOKE ALL ON FUNCTION public.save_project_atomic(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_project_atomic(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_project_atomic(jsonb) TO authenticated;

COMMIT;
