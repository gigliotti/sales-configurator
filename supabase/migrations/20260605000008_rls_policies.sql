-- ============================================
-- Migration 008: Row Level Security (RLS) Policies
-- ============================================
-- Roles:
--   admin  → full CRUD on catalog (components, specs, configurations, translations)
--   seller → read catalog, full CRUD on own projects/lines/versions
--   client → read-only on shared projects via share_token
-- ============================================

-- ────────────────────────────────────────────
-- § 0  Helper Function
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(20) AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;


-- ════════════════════════════════════════════
-- § 1  Enable RLS on All Tables
-- ════════════════════════════════════════════

-- Catalog tables
ALTER TABLE components                ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_transport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_product_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE palletizer_specs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conveyor_specs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE manipulator_specs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapper_specs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_unit_specs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_dispenser_specs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_dispenser_specs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_of_line_specs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE collar_specs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_frame_specs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE infeed_palletizer_compatibility     ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_frame_palletizer_compatibility ENABLE ROW LEVEL SECURITY;

-- Configuration/accessory tables
ALTER TABLE conveyor_accessories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE infeed_coupling_compatibility   ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_frame_configurations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_unit_configurations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapper_configurations          ENABLE ROW LEVEL SECURITY;

-- 3D
ALTER TABLE connection_points ENABLE ROW LEVEL SECURITY;

-- Platform tables
ALTER TABLE translations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_component_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles   ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════
-- § 2  COMPONENTS (base table)
-- ════════════════════════════════════════════

CREATE POLICY components_admin_all
  ON components FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY components_read_available
  ON components FOR SELECT TO authenticated
  USING (available = true);

-- ── Spec tables (inherit from component availability) ──

-- Macro: each spec table gets admin + read-if-available
-- We use a DO block to avoid repetition

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
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON %I FOR ALL TO authenticated
       USING (get_user_role() = ''admin'')
       WITH CHECK (get_user_role() = ''admin'')',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_read_available ON %I FOR SELECT TO authenticated
       USING (EXISTS (
         SELECT 1 FROM components c
         WHERE c.id = %I.component_id AND c.available = true
       ))',
      tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ── Compatibility tables (requires both components to be available) ──

CREATE POLICY infeed_palletizer_compatibility_admin_all
  ON infeed_palletizer_compatibility FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY infeed_palletizer_compatibility_read_available
  ON infeed_palletizer_compatibility FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = infeed_palletizer_compatibility.infeed_id AND c.available = true
    ) AND EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = infeed_palletizer_compatibility.palletizer_id AND c.available = true
    )
  );

CREATE POLICY main_frame_palletizer_compatibility_admin_all
  ON main_frame_palletizer_compatibility FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY main_frame_palletizer_compatibility_read_available
  ON main_frame_palletizer_compatibility FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = main_frame_palletizer_compatibility.main_frame_id AND c.available = true
    ) AND EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = main_frame_palletizer_compatibility.palletizer_id AND c.available = true
    )
  );


-- ════════════════════════════════════════════
-- § 3  CONFIGURATION / ACCESSORY TABLES
-- ════════════════════════════════════════════

-- Conveyor accessories (linked to transport_type, not component directly)
CREATE POLICY conveyor_accessories_admin_all
  ON conveyor_accessories FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY conveyor_accessories_read_all
  ON conveyor_accessories FOR SELECT TO authenticated
  USING (true);

-- Config tables linked to components via component_id-like FK
DO $$
DECLARE
  tbl TEXT;
  fk_col TEXT;
BEGIN
  -- (table_name, fk_column_name)
  FOREACH tbl IN ARRAY ARRAY[
    'infeed_coupling_compatibility',
    'main_frame_configurations',
    'turn_unit_configurations',
    'wrapper_configurations'
  ] LOOP
    -- Determine FK column name
    IF tbl = 'infeed_coupling_compatibility' THEN
      fk_col := 'infeed_id';
    ELSIF tbl = 'main_frame_configurations' THEN
      fk_col := 'main_frame_id';
    ELSIF tbl = 'turn_unit_configurations' THEN
      fk_col := 'turn_unit_id';
    ELSIF tbl = 'wrapper_configurations' THEN
      fk_col := 'wrapper_id';
    END IF;

    EXECUTE format(
      'CREATE POLICY %I_admin_all ON %I FOR ALL TO authenticated
       USING (get_user_role() = ''admin'')
       WITH CHECK (get_user_role() = ''admin'')',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_read_available ON %I FOR SELECT TO authenticated
       USING (EXISTS (
         SELECT 1 FROM components c
         WHERE c.id = %I.%I AND c.available = true
       ))',
      tbl, tbl, tbl, fk_col
    );
  END LOOP;
END $$;


-- ════════════════════════════════════════════
-- § 4  TRANSLATIONS
-- ════════════════════════════════════════════

CREATE POLICY translations_admin_all
  ON translations FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY translations_read_all
  ON translations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY translations_read_anon
  ON translations FOR SELECT TO anon
  USING (true);


-- ════════════════════════════════════════════
-- § 5  PROJECTS
-- ════════════════════════════════════════════

CREATE POLICY projects_admin_all
  ON projects FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY projects_seller_all
  ON projects FOR ALL TO authenticated
  USING (get_user_role() = 'seller' AND owner_id = auth.uid())
  WITH CHECK (get_user_role() = 'seller' AND owner_id = auth.uid());

CREATE POLICY projects_client_read_shared
  ON projects FOR SELECT TO authenticated
  USING (
    get_user_role() = 'client'
    AND share_token IS NOT NULL
    AND share_token = current_setting('request.headers', true)::json->>'x-share-token'
  );

CREATE POLICY projects_anon_read_shared
  ON projects FOR SELECT TO anon
  USING (
    share_token IS NOT NULL
    AND share_token = current_setting('request.headers', true)::json->>'x-share-token'
  );


-- ════════════════════════════════════════════
-- § 6  PROJECT_LINES
-- ════════════════════════════════════════════

CREATE POLICY project_lines_admin_all
  ON project_lines FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY project_lines_seller_all
  ON project_lines FOR ALL TO authenticated
  USING (
    get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_lines.project_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_lines.project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY project_lines_client_read_shared
  ON project_lines FOR SELECT TO authenticated
  USING (
    get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_lines.project_id
        AND p.share_token IS NOT NULL
        AND p.share_token = current_setting('request.headers', true)::json->>'x-share-token'
    )
  );

CREATE POLICY project_lines_anon_read_shared
  ON project_lines FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_lines.project_id
        AND p.share_token IS NOT NULL
        AND p.share_token = current_setting('request.headers', true)::json->>'x-share-token'
    )
  );


-- ════════════════════════════════════════════
-- § 7  LINE_COMPONENTS + OPTIONS
-- ════════════════════════════════════════════

CREATE POLICY line_components_admin_all
  ON line_components FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY line_components_seller_all
  ON line_components FOR ALL TO authenticated
  USING (
    get_user_role() = 'seller'
    AND EXISTS (
      SELECT 1 FROM project_lines pl JOIN projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'seller'
    AND EXISTS (
      SELECT 1 FROM project_lines pl JOIN projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY line_components_client_read_shared
  ON line_components FOR SELECT TO authenticated
  USING (
    get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM project_lines pl JOIN projects p ON p.id = pl.project_id
      WHERE pl.id = line_components.line_id
        AND p.share_token IS NOT NULL
        AND p.share_token = current_setting('request.headers', true)::json->>'x-share-token'
    )
  );

-- line_component_options follows line_components
CREATE POLICY line_component_options_admin_all
  ON line_component_options FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY line_component_options_seller_all
  ON line_component_options FOR ALL TO authenticated
  USING (
    get_user_role() = 'seller'
    AND EXISTS (
      SELECT 1 FROM line_components lc
      JOIN project_lines pl ON pl.id = lc.line_id
      JOIN projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'seller'
    AND EXISTS (
      SELECT 1 FROM line_components lc
      JOIN project_lines pl ON pl.id = lc.line_id
      JOIN projects p ON p.id = pl.project_id
      WHERE lc.id = line_component_options.line_component_id
        AND p.owner_id = auth.uid()
    )
  );

-- project_versions follows projects
CREATE POLICY project_versions_admin_all
  ON project_versions FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY project_versions_seller_all
  ON project_versions FOR ALL TO authenticated
  USING (
    get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_versions.project_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_versions.project_id AND p.owner_id = auth.uid())
  );


-- ════════════════════════════════════════════
-- § 8  USER_PROFILES
-- ════════════════════════════════════════════

CREATE POLICY user_profiles_admin_all
  ON user_profiles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

CREATE POLICY user_profiles_read_own
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_profiles_update_own
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ════════════════════════════════════════════
-- § 9  Summary
-- ════════════════════════════════════════════
-- ┌─────────────────────────┬───────────┬─────────────────────┬───────────────────────┐
-- │ Table                   │ Admin     │ Seller              │ Client / Anon         │
-- ├─────────────────────────┼───────────┼─────────────────────┼───────────────────────┤
-- │ components (+specs,     │ ALL       │ SELECT (available)  │ SELECT (available)    │
-- │  connections, configs)  │           │                     │                       │
-- │ translations            │ ALL       │ SELECT              │ SELECT                │
-- │ projects                │ ALL       │ ALL (own)           │ SELECT (share_token)  │
-- │ project_lines           │ ALL       │ ALL (own project)   │ SELECT (share_token)  │
-- │ line_components (+opts) │ ALL       │ ALL (own project)   │ SELECT (share_token)  │
-- │ project_versions        │ ALL       │ ALL (own project)   │ -                     │
-- │ user_profiles           │ ALL       │ R/W own             │ R/W own               │
-- └─────────────────────────┴───────────┴─────────────────────┴───────────────────────┘
