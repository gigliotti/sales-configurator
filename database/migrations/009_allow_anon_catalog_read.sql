-- ============================================
-- Migration 009: Allow Anon Catalog Read
-- ============================================
-- Update select policies on catalog lookup, specs, configurations,
-- and connections tables to permit 'anon' role reads.
-- ============================================

BEGIN;

-- 1. Base components table
DROP POLICY IF EXISTS components_read_available ON components;
CREATE POLICY components_read_available ON components
  FOR SELECT TO authenticated, anon
  USING (available = true);

-- 2. Spec and connections tables (loop)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'component_transport_types', 'component_product_types',
    'palletizer_specs', 'conveyor_specs', 'manipulator_specs',
    'wrapper_specs', 'turn_unit_specs', 'pallet_dispenser_specs',
    'sheet_dispenser_specs', 'end_of_line_specs', 'collar_specs',
    'main_frame_specs', 'connection_points'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read_available ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_read_available ON %I FOR SELECT TO authenticated, anon
       USING (EXISTS (
         SELECT 1 FROM components c
         WHERE c.id = %I.component_id AND c.available = true
       ))',
      tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- 3. Compatibility tables
DROP POLICY IF EXISTS infeed_palletizer_compatibility_read_available ON infeed_palletizer_compatibility;
CREATE POLICY infeed_palletizer_compatibility_read_available
  ON infeed_palletizer_compatibility FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = infeed_palletizer_compatibility.infeed_id AND c.available = true
    ) AND EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = infeed_palletizer_compatibility.palletizer_id AND c.available = true
    )
  );

DROP POLICY IF EXISTS main_frame_palletizer_compatibility_read_available ON main_frame_palletizer_compatibility;
CREATE POLICY main_frame_palletizer_compatibility_read_available
  ON main_frame_palletizer_compatibility FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = main_frame_palletizer_compatibility.main_frame_id AND c.available = true
    ) AND EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = main_frame_palletizer_compatibility.palletizer_id AND c.available = true
    )
  );

-- 4. Configurations & Accessories
DROP POLICY IF EXISTS conveyor_accessories_read_all ON conveyor_accessories;
CREATE POLICY conveyor_accessories_read_all
  ON conveyor_accessories FOR SELECT TO authenticated, anon
  USING (true);

DO $$
DECLARE
  tbl TEXT;
  fk_col TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'infeed_coupling_compatibility',
    'main_frame_configurations',
    'turn_unit_configurations',
    'wrapper_configurations'
  ] LOOP
    IF tbl = 'infeed_coupling_compatibility' THEN
      fk_col := 'infeed_id';
    ELSIF tbl = 'main_frame_configurations' THEN
      fk_col := 'main_frame_id';
    ELSIF tbl = 'turn_unit_configurations' THEN
      fk_col := 'turn_unit_id';
    ELSIF tbl = 'wrapper_configurations' THEN
      fk_col := 'wrapper_id';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I_read_available ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_read_available ON %I FOR SELECT TO authenticated, anon
       USING (EXISTS (
         SELECT 1 FROM components c
         WHERE c.id = %I.%I AND c.available = true
       ))',
      tbl, tbl, tbl, fk_col
    );
  END LOOP;
END $$;

-- 5. Lookup tables RLS updates
DROP POLICY IF EXISTS component_types_read ON public.component_types;
CREATE POLICY component_types_read ON public.component_types FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS connection_types_read ON public.connection_types;
CREATE POLICY connection_types_read ON public.connection_types FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS orientations_read ON public.orientations;
CREATE POLICY orientations_read ON public.orientations FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS product_types_read ON public.product_types;
CREATE POLICY product_types_read ON public.product_types FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS transport_types_read ON public.transport_types;
CREATE POLICY transport_types_read ON public.transport_types FOR SELECT TO authenticated, anon USING (true);

COMMIT;
