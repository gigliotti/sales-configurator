-- ============================================
-- Migration 002: Base Components Table (Hybrid Architecture)
-- ============================================
-- Central table that all component types extend.
-- Preserves compatibility with the legacy MariaDB
-- module_configs table (model_id / model_path).
-- ============================================

-- Base table for ALL components (hybrid pattern)
-- Each component type has a specific extension table
-- that references components.id as its PK / FK.
CREATE TABLE IF NOT EXISTS components (
    id              SERIAL PRIMARY KEY,
    component_type_id INT NOT NULL REFERENCES component_types(id),

    code            VARCHAR(20),          -- Verbruggen code (VE prefix or numeric). NULL if pending.
    name            VARCHAR(100) NOT NULL,-- Technical name (not translated). E.g. 'V-STACK 630'
    available       BOOLEAN DEFAULT true,
    location_id     INT REFERENCES locations(id),
    price_eur       DECIMAL(12,2),        -- NULL if price pending

    -- 3D model reference (compatible with existing module_configs)
    -- model_id follows the legacy format: TypeName_Code
    -- Examples: 'v-stack_630', 'RollerConveyor_VE024787', 'ChainWrapper_VE045490'
    model_id        VARCHAR(100),         -- Legacy key for 3D configurator lookup
    model_path      VARCHAR(255),         -- Path to .glb file

    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_components_type      ON components(component_type_id);
CREATE INDEX idx_components_code      ON components(code);
CREATE INDEX idx_components_available ON components(available);
CREATE INDEX idx_components_model_id  ON components(model_id);


-- ============================================
-- N:M Relationship Tables
-- ============================================

-- Transport types supported by each component
-- (e.g. roller, chain, belt)
CREATE TABLE IF NOT EXISTS component_transport_types (
    component_id      INT REFERENCES components(id) ON DELETE CASCADE,
    transport_type_id INT REFERENCES transport_types(id),
    PRIMARY KEY (component_id, transport_type_id)
);

-- Product types supported by each component
-- (e.g. box, pallet, tray)
CREATE TABLE IF NOT EXISTS component_product_types (
    component_id    INT REFERENCES components(id) ON DELETE CASCADE,
    product_type_id INT REFERENCES product_types(id),
    PRIMARY KEY (component_id, product_type_id)
);
