-- ============================================
-- Migration 005: 3D Connection Points
-- Migrated from legacy snap_points table
-- ============================================

CREATE TABLE IF NOT EXISTS connection_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    connection_type_id INT REFERENCES connection_types(id),
    
    -- Position relative to model origin (meters)
    pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    pos_z DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Rotation (radians)
    rot_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    rot_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    rot_z DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Normal/direction vector
    normal_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    normal_y DOUBLE PRECISION NOT NULL DEFAULT 1,
    normal_z DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Metadata
    label VARCHAR(100),
    category VARCHAR(100)  -- Legacy: 'Pallet Infeed', 'Pallet Outfeed', 'Product Infeed'
);

CREATE INDEX idx_connection_points_component ON connection_points(component_id);
