-- ============================================================================
-- Migration 004: Configuration & Accessory Tables
-- ============================================================================
-- Creates tables for component-level configurations and accessories:
--   • conveyor_accessories
--   • infeed_coupling_compatibility
--   • main_frame_configurations
--   • turn_unit_configurations
--   • wrapper_configurations
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONVEYOR ACCESSORIES
-- ============================================================================
-- Generic accessories available per transport type (rollers, belts, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conveyor_accessories (
    id              SERIAL          PRIMARY KEY,
    code            VARCHAR(20)     NOT NULL,
    name            VARCHAR(80)     NOT NULL,
    transport_type_id INT           NOT NULL
                        REFERENCES transport_types(id)
                        ON DELETE RESTRICT,
    description_key VARCHAR(100),                       -- i18n translation key
    price_eur       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  conveyor_accessories               IS 'Accessories available for conveyors, scoped by transport type.';
COMMENT ON COLUMN conveyor_accessories.description_key IS 'Internationalization (i18n) key for the accessory description.';

CREATE INDEX IF NOT EXISTS idx_conveyor_accessories_transport_type
    ON conveyor_accessories(transport_type_id);

CREATE INDEX IF NOT EXISTS idx_conveyor_accessories_code
    ON conveyor_accessories(code);


-- ============================================================================
-- 2. INFEED COUPLING COMPATIBILITY
-- ============================================================================
-- Defines which coupling codes are compatible with each infeed component,
-- along with dimensional constraints and pricing.
-- ============================================================================

CREATE TABLE IF NOT EXISTS infeed_coupling_compatibility (
    id              SERIAL          PRIMARY KEY,
    coupling_code   VARCHAR(20)     NOT NULL,
    infeed_id       INT             NOT NULL
                        REFERENCES components(id)
                        ON DELETE CASCADE,
    available       BOOLEAN         NOT NULL DEFAULT true,
    min_length_mm   INT,
    min_width_mm    INT,
    max_length_mm   INT,
    max_width_mm    INT,
    price_eur       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  infeed_coupling_compatibility IS 'Coupling compatibility matrix for infeed components with dimensional limits.';

CREATE INDEX IF NOT EXISTS idx_infeed_coupling_infeed_id
    ON infeed_coupling_compatibility(infeed_id);

CREATE INDEX IF NOT EXISTS idx_infeed_coupling_code
    ON infeed_coupling_compatibility(coupling_code);


-- ============================================================================
-- 3. MAIN FRAME CONFIGURATIONS
-- ============================================================================
-- Height, collar, and sheet-dispenser options for main-frame components,
-- scoped by product type.
-- ============================================================================

CREATE TABLE IF NOT EXISTS main_frame_configurations (
    id                          SERIAL          PRIMARY KEY,
    main_frame_id               INT             NOT NULL
                                    REFERENCES components(id)
                                    ON DELETE CASCADE,
    product_type_id             INT             NOT NULL
                                    REFERENCES product_types(id)
                                    ON DELETE RESTRICT,
    height_mm                   INT,
    lower_collar                BOOLEAN         NOT NULL DEFAULT false,
    integrated_sheet_dispenser  BOOLEAN         NOT NULL DEFAULT false,
    price_eur                   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  main_frame_configurations IS 'Configuration variants for main-frame components per product type.';
COMMENT ON COLUMN main_frame_configurations.integrated_sheet_dispenser
    IS 'When TRUE the frame includes a built-in sheet dispenser, which excludes adding an external SheetDispenser component.';

CREATE INDEX IF NOT EXISTS idx_main_frame_cfg_main_frame_id
    ON main_frame_configurations(main_frame_id);

CREATE INDEX IF NOT EXISTS idx_main_frame_cfg_product_type_id
    ON main_frame_configurations(product_type_id);


-- ============================================================================
-- 4. TURN UNIT CONFIGURATIONS
-- ============================================================================
-- Brake, guide, and speed options for turn-unit components.
-- ============================================================================

CREATE TABLE IF NOT EXISTS turn_unit_configurations (
    id                  SERIAL          PRIMARY KEY,
    turn_unit_id        INT             NOT NULL
                            REFERENCES components(id)
                            ON DELETE CASCADE,
    pallet_brake        BOOLEAN         NOT NULL DEFAULT false,
    pallet_guide        BOOLEAN         NOT NULL DEFAULT false,
    rotation_speed_ms   DECIMAL(4,2),
    price_eur           DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  turn_unit_configurations IS 'Configuration options for turn-unit components (brake, guide, speed).';
COMMENT ON COLUMN turn_unit_configurations.rotation_speed_ms IS 'Rotation speed in milliseconds (e.g. 1.50 = 1500 µs).';

CREATE INDEX IF NOT EXISTS idx_turn_unit_cfg_turn_unit_id
    ON turn_unit_configurations(turn_unit_id);


-- ============================================================================
-- 5. WRAPPER CONFIGURATIONS
-- ============================================================================
-- Wrap type, paper, clamp, and cut-and-seal options for wrapper components.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapper_configurations (
    id              SERIAL          PRIMARY KEY,
    wrapper_id      INT             NOT NULL
                        REFERENCES components(id)
                        ON DELETE CASCADE,
    wrap_type       VARCHAR(10)     NOT NULL
                        CHECK (wrap_type IN ('RED', 'FILM')),
    paper_addition  BOOLEAN         NOT NULL DEFAULT false,
    clamp_type      VARCHAR(10)     NOT NULL DEFAULT 'BASE'
                        CHECK (clamp_type IN ('BASE')),
    cut_and_seal    VARCHAR(10)     NOT NULL DEFAULT 'NONE'
                        CHECK (cut_and_seal IN ('CU', 'SU', 'CUSR', 'SUSR', 'CULR', 'SULR', 'NONE')),
    price_eur       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  wrapper_configurations IS 'Configuration variants for wrapper components (wrap type, sealing, clamping).';
COMMENT ON COLUMN wrapper_configurations.wrap_type     IS 'Wrapping material type: RED (stretch hood / reductive) or FILM.';
COMMENT ON COLUMN wrapper_configurations.clamp_type    IS 'Clamp variant applied during wrapping. Currently only BASE is supported.';
COMMENT ON COLUMN wrapper_configurations.cut_and_seal  IS 'Cut-and-seal mode: CU, SU, CUSR, SULR, or NONE.';

CREATE INDEX IF NOT EXISTS idx_wrapper_cfg_wrapper_id
    ON wrapper_configurations(wrapper_id);

COMMIT;
