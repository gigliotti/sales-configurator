-- ============================================================================
-- Migración 20260724100200: RPC de catálogo completo
-- ============================================================================
-- get_catalog_full() devuelve en UNA sola llamada todo lo que el configurador
-- necesita para arrancar, evitando la ráfaga de ~15 SELECTs del frontend:
--
--   {
--     "components": [ { id, code, name, component_type_id, component_type,
--                       component_type_label_key, available, location_id,
--                       price_eur, model_id, model_path,
--                       transport_type_ids: [..], product_type_ids: [..],
--                       specs: { ...fila de su tabla *_specs... } | null } ],
--     "transport_types": [ { id, name } ],
--     "product_types":   [ { id, name } ],
--     "infeed_palletizer_compatibility":     [ { infeed_id, palletizer_id } ],
--     "main_frame_palletizer_compatibility": [ { main_frame_id, palletizer_id } ]
--   }
--
-- SECURITY DEFINER (con search_path fijado) porque el catálogo es público de
-- solo lectura por diseño: solo expone componentes con available = true.
-- Los tipos sin tabla de specs (infeed, safety, platform, support_frame)
-- devuelven specs = null.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_catalog_full()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'components', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',                       c.id,
          'code',                     c.code,
          'name',                     c.name,
          'component_type_id',        c.component_type_id,
          'component_type',           ct.name,
          'component_type_label_key', ct.label_key,
          'available',                c.available,
          'location_id',              c.location_id,
          'price_eur',                c.price_eur,
          'model_id',                 c.model_id,
          'model_path',               c.model_path,
          'transport_type_ids', COALESCE((
            SELECT jsonb_agg(ctt.transport_type_id ORDER BY ctt.transport_type_id)
            FROM component_transport_types ctt
            WHERE ctt.component_id = c.id
          ), '[]'::jsonb),
          'product_type_ids', COALESCE((
            SELECT jsonb_agg(cpt.product_type_id ORDER BY cpt.product_type_id)
            FROM component_product_types cpt
            WHERE cpt.component_id = c.id
          ), '[]'::jsonb),
          -- Join dinámico por tipo: cada tipo lee su tabla *_specs.
          -- Se descartan created_at/updated_at por ser ruido para el cliente.
          'specs', CASE ct.name
            WHEN 'palletizer' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM palletizer_specs s WHERE s.component_id = c.id)
            WHEN 'conveyor' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM conveyor_specs s WHERE s.component_id = c.id)
            WHEN 'manipulator' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM manipulator_specs s WHERE s.component_id = c.id)
            WHEN 'wrapper' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM wrapper_specs s WHERE s.component_id = c.id)
            WHEN 'turn_unit' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM turn_unit_specs s WHERE s.component_id = c.id)
            WHEN 'pallet_dispenser' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM pallet_dispenser_specs s WHERE s.component_id = c.id)
            WHEN 'sheet_dispenser' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM sheet_dispenser_specs s WHERE s.component_id = c.id)
            WHEN 'end_of_line' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM end_of_line_specs s WHERE s.component_id = c.id)
            WHEN 'collar' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM collar_specs s WHERE s.component_id = c.id)
            WHEN 'main_frame' THEN
              (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM main_frame_specs s WHERE s.component_id = c.id)
            ELSE NULL
          END
        )
        ORDER BY c.id
      )
      FROM components c
      JOIN component_types ct ON ct.id = c.component_type_id
      WHERE c.available = true
    ), '[]'::jsonb),

    'transport_types', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM transport_types t
    ), '[]'::jsonb),

    'product_types', COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM product_types p
    ), '[]'::jsonb),

    -- Compatibilidades: solo entre componentes disponibles, en línea con
    -- las políticas RLS de lectura del catálogo.
    'infeed_palletizer_compatibility', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('infeed_id', ipc.infeed_id, 'palletizer_id', ipc.palletizer_id)
        ORDER BY ipc.infeed_id, ipc.palletizer_id
      )
      FROM infeed_palletizer_compatibility ipc
      JOIN components ci ON ci.id = ipc.infeed_id     AND ci.available = true
      JOIN components cp ON cp.id = ipc.palletizer_id AND cp.available = true
    ), '[]'::jsonb),

    'main_frame_palletizer_compatibility', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('main_frame_id', mfc.main_frame_id, 'palletizer_id', mfc.palletizer_id)
        ORDER BY mfc.main_frame_id, mfc.palletizer_id
      )
      FROM main_frame_palletizer_compatibility mfc
      JOIN components cm ON cm.id = mfc.main_frame_id AND cm.available = true
      JOIN components cp ON cp.id = mfc.palletizer_id AND cp.available = true
    ), '[]'::jsonb)
  );
$$;

-- Catálogo público de solo lectura: anon (modo invitado) y authenticated.
REVOKE ALL ON FUNCTION public.get_catalog_full() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_full() TO anon, authenticated;

COMMIT;
