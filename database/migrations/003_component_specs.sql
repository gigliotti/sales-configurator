-- ============================================================================
-- Migration 003: Component Specification Tables
-- ============================================================================
-- Creates extension/spec tables for each component type (class-table inheritance).
-- Each table uses component_id as its PRIMARY KEY, referencing components(id).
-- Also creates compatibility junction tables for infeed–palletizer and
-- main_frame–palletizer relationships.
-- ============================================================================

-- ============================================================================
-- 1. PALLETIZER SPECS
-- ============================================================================
-- Production rates, layer geometry, weight limits per manipulator size,
-- and min/max product dimensions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS palletizer_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_production_rate     INT,                -- units per minute
    units_5_per_layer       INT,                -- units per layer on 5-row pallet
    units_13_per_layer      INT,                -- units per layer on 13-row pallet
    max_layer_length_mm     INT,
    max_layer_width_mm      INT,
    max_weight_medium_kg    INT,                -- max weight with medium manipulator
    max_weight_large_kg     INT,                -- max weight with large manipulator
    min_product_length_mm   INT,
    min_product_width_mm    INT,
    min_product_height_mm   INT,
    max_product_length_mm   INT,
    max_product_width_mm    INT,
    max_product_height_mm   INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CONVEYOR SPECS
-- ============================================================================
-- Conveyor dimensions and maximum pallet size it can transport.
-- ============================================================================
CREATE TABLE IF NOT EXISTS conveyor_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    conveyor_length_mm      INT,
    conveyor_width_mm       INT,
    max_pallet_length_mm    INT,
    max_pallet_width_mm     INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. MANIPULATOR SPECS
-- ============================================================================
-- Maximum product dimensions and weight the manipulator can handle.
-- ============================================================================
CREATE TABLE IF NOT EXISTS manipulator_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_product_width_mm    INT,
    max_product_length_mm   INT,
    max_product_weight_kg   DECIMAL(8,2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. WRAPPER SPECS
-- ============================================================================
-- Pallet size limits, max wrap height, load capacity, and wrapping throughput.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wrapper_specs (
    component_id                INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_pallet_length_mm        INT,
    max_pallet_width_mm         INT,
    max_wrap_height_mm          INT,
    max_load_kg                 INT,
    wrap_speed_units_per_hour   INT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TURN UNIT SPECS
-- ============================================================================
-- Pallet width limit, weight capacity, rotation direction and angle.
-- ============================================================================
CREATE TABLE IF NOT EXISTS turn_unit_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_pallet_width_mm     INT,
    max_weight_kg           INT,
    rotation_direction      VARCHAR(20),        -- e.g. 'CW', 'CCW', 'BOTH'
    rotation_degrees        INT,                -- e.g. 90, 180
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PALLET DISPENSER SPECS
-- ============================================================================
-- Max pallet dimensions, feed orientation, stacking capacity, and weight limit.
-- ============================================================================
CREATE TABLE IF NOT EXISTS pallet_dispenser_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_pallet_length_mm    INT,
    max_pallet_width_mm     INT,
    orientation_id          INT REFERENCES orientations(id),
    max_stacking_units      INT,
    max_weight_kg           INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. SHEET DISPENSER SPECS
-- ============================================================================
-- Max pallet dimensions, feed orientation, and sheet stack height.
-- ============================================================================
CREATE TABLE IF NOT EXISTS sheet_dispenser_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_pallet_length_mm    INT,
    max_pallet_width_mm     INT,
    orientation_id          INT REFERENCES orientations(id),
    max_sheet_stack_mm      INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. END OF LINE SPECS
-- ============================================================================
-- Throughput capacity in units per minute.
-- ============================================================================
CREATE TABLE IF NOT EXISTS end_of_line_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    capacity_units_per_min  INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. COLLAR SPECS
-- ============================================================================
-- Maximum collar dimensions and number of programmable sides.
-- ============================================================================
CREATE TABLE IF NOT EXISTS collar_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    max_collar_length_mm    INT,
    max_collar_width_mm     INT,
    programmable_sides      INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. MAIN FRAME SPECS
-- ============================================================================
-- Physical footprint of the main frame structure.
-- ============================================================================
CREATE TABLE IF NOT EXISTS main_frame_specs (
    component_id            INT PRIMARY KEY REFERENCES components(id) ON DELETE CASCADE,
    main_frame_length_mm    INT,
    main_frame_width_mm     INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- COMPATIBILITY JUNCTION TABLES
-- ============================================================================
-- These tables record which components are compatible with which palletizers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Infeed ↔ Palletizer Compatibility
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infeed_palletizer_compatibility (
    infeed_id       INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    palletizer_id   INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (infeed_id, palletizer_id)
);

-- ----------------------------------------------------------------------------
-- Main Frame ↔ Palletizer Compatibility
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS main_frame_palletizer_compatibility (
    main_frame_id   INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    palletizer_id   INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (main_frame_id, palletizer_id)
);
