-- ============================================
-- Migration 001: Lookup Tables (Enums)
-- Configurador 3D de Paletizado - Verbruggen
-- ============================================
-- Creates all reference/lookup tables used as
-- enumerations throughout the application.
-- These tables are immutable in normal operation.
-- ============================================

-- -----------------------------------------------
-- Transport types
-- Defines how products/pallets move on conveyors
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS transport_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL  -- 'RODILLO', 'CADENA', 'NONE'
);

-- -----------------------------------------------
-- Product types
-- Categories of products the palletizer handles
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL  -- 'CAJA', 'BOLSA'
);

-- -----------------------------------------------
-- Locations in the palletizing line
-- Fixed positions with deterministic IDs
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id INT PRIMARY KEY,              -- 0, 1, 2
    name VARCHAR(30) NOT NULL        -- 'Pallet Infeed', 'Pallet Outfeed', 'Product Infeed'
);

-- -----------------------------------------------
-- Orientations for dispensers
-- Determines which side a dispenser faces
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS orientations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL  -- 'DERECHA', 'IZQUIERDA', 'NONE'
);

-- -----------------------------------------------
-- Component types (extensible)
-- Each type maps to an i18n label key for the UI
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS component_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL, -- 'palletizer', 'conveyor', etc.
    label_key VARCHAR(50) NOT NULL    -- i18n key: 'component.palletizer'
);

-- -----------------------------------------------
-- Connection point types for 3D snap
-- Defines valid snap/connection points between
-- components in the 3D scene
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS connection_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL  -- 'PALLET_IN', 'PALLET_OUT', 'PRODUCT_IN', 'PRODUCT_OUT'
);


-- ============================================
-- SEED DATA
-- ============================================

-- Transport types
INSERT INTO transport_types (name) VALUES
    ('RODILLO'),
    ('CADENA'),
    ('NONE')
ON CONFLICT (name) DO NOTHING;

-- Product types
INSERT INTO product_types (name) VALUES
    ('CAJA'),
    ('BOLSA')
ON CONFLICT (name) DO NOTHING;

-- Locations (deterministic IDs)
INSERT INTO locations (id, name) VALUES
    (0, 'Pallet Infeed'),
    (1, 'Pallet Outfeed'),
    (2, 'Product Infeed')
ON CONFLICT (id) DO NOTHING;

-- Orientations
INSERT INTO orientations (name) VALUES
    ('DERECHA'),
    ('IZQUIERDA'),
    ('NONE')
ON CONFLICT (name) DO NOTHING;

-- Component types (IDs 1-11, matching seed data references)
INSERT INTO component_types (name, label_key) VALUES
    ('palletizer',       'component.palletizer'),        -- 1
    ('conveyor',         'component.conveyor'),           -- 2
    ('infeed',           'component.infeed'),             -- 3
    ('manipulator',      'component.manipulator'),        -- 4
    ('wrapper',          'component.wrapper'),            -- 5
    ('turn_unit',        'component.turn_unit'),          -- 6
    ('pallet_dispenser', 'component.pallet_dispenser'),   -- 7
    ('sheet_dispenser',  'component.sheet_dispenser'),    -- 8
    ('end_of_line',      'component.end_of_line'),        -- 9
    ('collar',           'component.collar'),             -- 10
    ('main_frame',       'component.main_frame'),          -- 11
    ('safety',           'component.safety'),             -- 12
    ('platform',         'component.platform'),           -- 13
    ('support_frame',    'component.support_frame')       -- 14
ON CONFLICT (name) DO NOTHING;

-- Connection types
INSERT INTO connection_types (name) VALUES
    ('PALLET_IN'),
    ('PALLET_OUT'),
    ('PRODUCT_IN'),
    ('PRODUCT_OUT')
ON CONFLICT (name) DO NOTHING;
