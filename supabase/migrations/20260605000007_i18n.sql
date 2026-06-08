-- ============================================
-- Migration 007: Internationalization (i18n)
-- ============================================

-- Translation strings
-- Keys follow dot notation: 'component.palletizer', 'location.pallet_infeed', etc.
-- Product names are NOT translated (stored in components.name)
-- Product descriptions, UI labels, and enum display names ARE translated
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(150) NOT NULL,
    language VARCHAR(10) NOT NULL,    -- 'es', 'en', 'nl', 'pt', etc.
    value TEXT NOT NULL,
    UNIQUE (key, language)
);

CREATE INDEX idx_translations_key ON translations(key);
CREATE INDEX idx_translations_language ON translations(language);

-- ============================================
-- Seed Data: Component Types
-- ============================================
INSERT INTO translations (key, language, value) VALUES
    ('component.palletizer',        'es', 'Paletizadora'),
    ('component.palletizer',        'en', 'Palletizer'),
    ('component.conveyor',          'es', 'Transportador'),
    ('component.conveyor',          'en', 'Conveyor'),
    ('component.infeed',            'es', 'Alimentador'),
    ('component.infeed',            'en', 'Infeed'),
    ('component.manipulator',       'es', 'Manipulador'),
    ('component.manipulator',       'en', 'Manipulator'),
    ('component.wrapper',           'es', 'Envolvedora'),
    ('component.wrapper',           'en', 'Wrapper'),
    ('component.turn_unit',         'es', 'Unidad de Giro'),
    ('component.turn_unit',         'en', 'Turn Unit'),
    ('component.pallet_dispenser',  'es', 'Dispensador de Pallets'),
    ('component.pallet_dispenser',  'en', 'Pallet Dispenser'),
    ('component.sheet_dispenser',   'es', 'Dispensador de Hojas'),
    ('component.sheet_dispenser',   'en', 'Sheet Dispenser'),
    ('component.end_of_line',       'es', 'Fin de Línea'),
    ('component.end_of_line',       'en', 'End of Line'),
    ('component.collar',            'es', 'Collar'),
    ('component.collar',            'en', 'Collar'),
    ('component.main_frame',        'es', 'Estructura Principal'),
    ('component.main_frame',        'en', 'Main Frame')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- Seed Data: Locations
-- ============================================
INSERT INTO translations (key, language, value) VALUES
    ('location.pallet_infeed',  'es', 'Entrada de Pallets'),
    ('location.pallet_infeed',  'en', 'Pallet Infeed'),
    ('location.pallet_outfeed', 'es', 'Salida de Pallets'),
    ('location.pallet_outfeed', 'en', 'Pallet Outfeed'),
    ('location.product_infeed', 'es', 'Entrada de Producto'),
    ('location.product_infeed', 'en', 'Product Infeed')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- Seed Data: Transport Types
-- ============================================
INSERT INTO translations (key, language, value) VALUES
    ('transport_type.rodillo', 'es', 'Rodillo'),
    ('transport_type.rodillo', 'en', 'Roller'),
    ('transport_type.cadena',  'es', 'Cadena'),
    ('transport_type.cadena',  'en', 'Chain'),
    ('transport_type.none',    'es', 'Ninguno'),
    ('transport_type.none',    'en', 'None')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- Seed Data: Product Types
-- ============================================
INSERT INTO translations (key, language, value) VALUES
    ('product_type.caja',  'es', 'Caja'),
    ('product_type.caja',  'en', 'Box'),
    ('product_type.bolsa', 'es', 'Bolsa'),
    ('product_type.bolsa', 'en', 'Bag')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- Seed Data: Orientations
-- ============================================
INSERT INTO translations (key, language, value) VALUES
    ('orientation.derecha',   'es', 'Derecha'),
    ('orientation.derecha',   'en', 'Right'),
    ('orientation.izquierda', 'es', 'Izquierda'),
    ('orientation.izquierda', 'en', 'Left'),
    ('orientation.none',      'es', 'Ninguna'),
    ('orientation.none',      'en', 'None')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;
