-- ============================================
-- Migration 006: Users, Projects, and Saved Configurations
-- ============================================
-- Creates the full persistence layer for user accounts,
-- project/quote management, line configurations, placed
-- components with 3D transforms, and version history.
-- ============================================


-- --------------------------------------------
-- 1. User Profiles
-- --------------------------------------------
-- Extends Supabase auth.users with app-specific fields.
-- The primary key is a foreign key to auth.users so that
-- deleting the auth record cascades to the profile.

CREATE TABLE IF NOT EXISTS user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name                VARCHAR(100),
    role                VARCHAR(20)  NOT NULL DEFAULT 'seller'
                            CHECK (role IN ('admin', 'seller', 'client')),
    preferred_language  VARCHAR(10)  DEFAULT 'es',
    preferred_units     VARCHAR(10)  DEFAULT 'metric'
                            CHECK (preferred_units IN ('metric', 'imperial')),
    created_at          TIMESTAMPTZ  DEFAULT now()
);


-- --------------------------------------------
-- 2. Projects
-- --------------------------------------------
-- A project groups multiple palletizing lines into a
-- single quote that can be shared with clients via a
-- unique token.

CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID          NOT NULL REFERENCES user_profiles(id),
    name            VARCHAR(200)  NOT NULL,
    client_name     VARCHAR(200),
    client_email    VARCHAR(255),
    status          VARCHAR(20)   DEFAULT 'draft'
                        CHECK (status IN ('draft', 'shared', 'approved', 'archived')),
    share_token     VARCHAR(64)   UNIQUE,
    total_price_eur DECIMAL(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ   DEFAULT now(),
    updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_projects_owner       ON projects(owner_id);
CREATE INDEX idx_projects_status      ON projects(status);
CREATE INDEX idx_projects_share_token ON projects(share_token);


-- --------------------------------------------
-- 3. Project Lines
-- --------------------------------------------
-- Each line represents one palletizing configuration
-- inside a project.  It stores all customer-input
-- parameters plus the selected palletizer and transport.

CREATE TABLE IF NOT EXISTS project_lines (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                    VARCHAR(200),
    sort_order              INT           DEFAULT 0,

    -- Customer input parameters
    product_type_id         INT           REFERENCES product_types(id),
    product_length_mm       INT,
    product_width_mm        INT,
    product_height_mm       INT,
    product_weight_kg       DECIMAL(8,2),
    desired_speed_upm       INT,
    pallet_length_mm        INT,
    pallet_width_mm         INT,
    units_per_layer         INT,
    total_pallet_height_mm  INT,
    preferred_wrap_type     VARCHAR(10)   CHECK (preferred_wrap_type IN ('RED', 'FILM')),
    max_budget_eur          DECIMAL(12,2),

    -- Selected palletizer and transport
    palletizer_id           INT           REFERENCES components(id),
    transport_type_id       INT           REFERENCES transport_types(id),

    -- Line price
    line_price_eur          DECIMAL(12,2) DEFAULT 0,

    created_at              TIMESTAMPTZ   DEFAULT now(),
    updated_at              TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_project_lines_project ON project_lines(project_id);


-- --------------------------------------------
-- 4. Line Components (3D Scene)
-- --------------------------------------------
-- Every component placed in a line's 3D scene, with its
-- world-space position/rotation and optional snap-point
-- connection to another component.

CREATE TABLE IF NOT EXISTS line_components (
    id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id               UUID             NOT NULL REFERENCES project_lines(id) ON DELETE CASCADE,
    component_id          INT              NOT NULL REFERENCES components(id),

    -- 3D position in scene
    pos_x                 DOUBLE PRECISION DEFAULT 0,
    pos_y                 DOUBLE PRECISION DEFAULT 0,
    pos_z                 DOUBLE PRECISION DEFAULT 0,

    -- 3D rotation (Euler angles, degrees)
    rot_x                 DOUBLE PRECISION DEFAULT 0,
    rot_y                 DOUBLE PRECISION DEFAULT 0,
    rot_z                 DOUBLE PRECISION DEFAULT 0,

    -- Connection info
    connected_to          UUID             REFERENCES line_components(id),
    parent_snap_point_id  UUID             REFERENCES connection_points(id),
    child_snap_point_id   UUID             REFERENCES connection_points(id),
    sort_order            INT              DEFAULT 0
);

CREATE INDEX idx_line_components_line ON line_components(line_id);


-- --------------------------------------------
-- 5. Line Component Options / Accessories
-- --------------------------------------------
-- Stores the selected options or accessories for each
-- placed component (e.g. guide-rail variant, sensor pack).

CREATE TABLE IF NOT EXISTS line_component_options (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    line_component_id UUID        NOT NULL REFERENCES line_components(id) ON DELETE CASCADE,
    option_type       VARCHAR(50) NOT NULL,
    option_id         INT         NOT NULL
);

CREATE INDEX idx_line_component_options_lc ON line_component_options(line_component_id);


-- --------------------------------------------
-- 6. Version History
-- --------------------------------------------
-- Full JSON snapshots of a project at each save point,
-- enabling undo / audit-trail functionality.

CREATE TABLE IF NOT EXISTS project_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version     INT  NOT NULL,
    snapshot    JSONB NOT NULL,
    created_by  UUID REFERENCES user_profiles(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_versions_project ON project_versions(project_id);
