-- ============================================
-- Seed 001: Catálogo completo de componentes Verbruggen
-- Datos extraídos de las tablas HTML de Google Sheets
-- ============================================
-- IMPORTANT: Run AFTER all migrations (001-008)
-- Uses ON CONFLICT DO NOTHING for idempotency

BEGIN;

-- ============================================
-- PALETIZADORAS (component_type_id = 1 = 'palletizer')
-- ============================================

-- V-STACK 315
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (1, 1, 'VE069108', 'V-STACK 315', true, NULL, 139869.00, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (1, 15, 750, 1200, 1250, 1250, 25, 25, 300, 400, 85, 400, 600, 450);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (1, 1); -- CAJA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (1, 3); -- NONE

-- V-STACK 320
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (2, 1, 'VE052439', 'V-STACK 320', true, NULL, 383914.06, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (2, 20, 780, 1575, 1250, 1250, 25, 25, 200, 200, 100, 400, 600, 400);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (2, 1); -- CAJA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (2, 1); -- RODILLO

-- V-STACK 535
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (3, 1, 'VE047037', 'V-STACK 535', true, NULL, 740000.00, 'v-stack_535', '/3d/Palletizer/v-stack_535.glb');

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (3, 35, 1100, 1680, 1350, 1350, 25, 25, 200, 200, 100, 400, 600, 400);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (3, 1); -- CAJA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (3, 1); -- RODILLO

-- V-STACK 745
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (4, 1, 'VE072508', 'V-STACK 745', true, NULL, 639627.18, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (4, 45, 1100, 1680, 1350, 1350, 25, 25, 200, 200, 100, 400, 600, 400);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (4, 1); -- CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES (4, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (4, 1); -- RODILLO

-- V-STACK 965
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (5, 1, 'VE047011', 'V-STACK 965', true, NULL, 293307.30, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (5, 80, 2030, 4065, 1350, 1350, 25, 25, 200, 200, 100, 400, 600, 400);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (5, 1); -- CAJA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (5, 1); -- RODILLO

-- V-STACK 410
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (6, 1, '79564', 'V-STACK 410', true, NULL, 78483.28, 'v-stack_410', '/3d/Palletizer/v-stack_410.glb');

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (6, 10, 550, 550, 1600, 1250, 25, 50, 350, 220, 50, 900, 560, 240);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (6, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (6, 1); -- RODILLO

-- V-STACK 618
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (7, 1, 'VE073550', 'V-STACK 618', true, NULL, 155984.00, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (7, 18, 920, 975, 1600, 1250, 25, 50, 350, 220, 50, 880, 590, 325);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (7, 1); -- CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES (7, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (7, 3); -- NONE

-- V-STACK 620
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (8, 1, 'VE060827', 'V-STACK 620', true, NULL, 270613.75, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (8, 18, 970, 1025, 1600, 1250, 25, 50, 350, 220, 50, 880, 590, 325);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (8, 1); -- CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES (8, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (8, 1); -- RODILLO
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (8, 2); -- CADENA

-- V-STACK 630
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (9, 1, 'VE088035', 'V-STACK 630', true, NULL, 315000.00, 'v-stack_630', '/3d/Palletizer/v-stack_630.glb');

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (9, 30, 1310, 1710, 1600, 1250, 25, 50, 350, 220, 50, 880, 590, 325);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (9, 1); -- CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES (9, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (9, 1); -- RODILLO
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (9, 2); -- CADENA

-- V-STACK 640
INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path)
VALUES (10, 1, 'VE090533', 'V-STACK 640', true, NULL, 487790.00, NULL, NULL);

INSERT INTO palletizer_specs (component_id, max_production_rate, units_5_per_layer, units_13_per_layer, max_layer_length_mm, max_layer_width_mm, max_weight_medium_kg, max_weight_large_kg, min_product_length_mm, min_product_width_mm, min_product_height_mm, max_product_length_mm, max_product_width_mm, max_product_height_mm)
VALUES (10, 40, 1710, 2280, 1600, 1250, 25, 50, 350, 220, 50, 880, 590, 325);

INSERT INTO component_product_types (component_id, product_type_id) VALUES (10, 1); -- CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES (10, 2); -- BOLSA
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (10, 1); -- RODILLO
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (10, 2); -- CADENA


-- ============================================
-- CONVEYORS (component_type_id = 2 = 'conveyor')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(11, 2, 'VE054374', 'Roller Conveyor VE054374', true, 0, 4980.00, 'RollerConveyor_VE054374', '/3d/Modules/RollerConveyor/RollerConveyor_VE054374.glb'),
(12, 2, 'VE027912', 'Roller Conveyor VE027912', true, 1, 5860.00, 'RollerConveyor_VE027912', '/3d/Modules/RollerConveyor/RollerConveyor_VE027912.glb'),
(13, 2, 'VE024787', 'Roller Conveyor VE024787', true, 1, 6035.00, 'RollerConveyor_VE024787', '/3d/Modules/RollerConveyor/RollerConveyor_VE024787.glb'),
(14, 2, 'VE051705', 'Roller Conveyor VE051705', true, 1, 6635.00, 'RollerConveyor_VE051705', '/3d/Modules/RollerConveyor/RollerConveyor_VE051705.glb'),
(15, 2, 'VE029180', 'Roller Conveyor VE029180', true, 1, 6035.00, 'RollerConveyor_VE029180', '/3d/Modules/RollerConveyor/RollerConveyor_VE029180.glb'),
(16, 2, 'VE051261', 'Roller Conveyor VE051261', true, 1, NULL, 'RollerConveyor_VE051261', '/3d/Modules/RollerConveyor/RollerConveyor_VE051261.glb'),
(17, 2, 'VE045455', 'Chain Conveyor VE045455', true, 1, 9400.00, 'ChainConveyor_VE045455', '/3d/Modules/ChainConveyor/ChainConveyor_VE045455.glb'),
(18, 2, 'VE045461', 'Chain Conveyor VE045461', true, 1, 7990.00, 'ChainConveyor_VE045461', '/3d/Modules/ChainConveyor/ChainConveyor_VE045461.glb'),
(19, 2, 'VE045445', 'Chain Conveyor VE045445', true, 1, 13915.00, 'ChainConveyor_VE045445', '/3d/Modules/ChainConveyor/ChainConveyor_VE045445.glb'),
(20, 2, 'VE045450', 'Chain Conveyor VE045450', true, 1, 9400.00, 'ChainConveyor_VE045450', '/3d/Modules/ChainConveyor/ChainConveyor_VE045450.glb'),
(21, 2, '7400.3150', 'Chain Conveyor 7400.3150', true, 1, 8380.00, NULL, NULL),
(22, 2, '7200.1001', 'Roller Conveyor 7200.1001', true, 0, 5240.00, NULL, NULL),
(23, 2, '7200.1103', 'Roller Conveyor 7200.1103', true, 0, 7204.00, NULL, NULL);

-- Conveyor specs
INSERT INTO conveyor_specs (component_id, conveyor_length_mm, conveyor_width_mm, max_pallet_length_mm, max_pallet_width_mm) VALUES
(11, 2640, 1100, 1200, 1000),
(12, 2040, 1100, 1200, 1000),
(13, 1560, 1100, 1200, 1000),
(14, 1560, 1100, 1200, 1000),
(15, 1560, 1100, 1200, 1000),
(16, 1560, 1100, 1200, 1000),
(17, 2250, 1070, 1165, 1165),
(18, 1500, 1070, 1165, 1165),
(19, 1500, 1070, 1165, 1165),
(20, 2250, 1070, 1165, 1165),
(21, 1500, 900, 1219, 1016),
(22, 2160, 1100, 1200, 800),
(23, 1800, 1350, 1165, 1165);

-- Conveyor transport types (RODILLO for roller, CADENA for chain)
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(11, 1), (12, 1), (13, 1), (14, 1), (15, 1), (16, 1), -- RODILLO
(17, 2), (18, 2), (19, 2), (20, 2), (21, 2),           -- CADENA
(22, 1), (23, 1);                                        -- RODILLO


-- ============================================
-- INFEEDS (component_type_id = 3 = 'infeed')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(24, 3, '63283',     'Infeed 63283',     true, 2, NULL, NULL, NULL),
(25, 3, '77573',     'Infeed 77573',     true, 2, NULL, NULL, NULL),
(26, 3, 'VE047112',  'Infeed VE047112',  true, 2, NULL, NULL, NULL),
(27, 3, 'VE046496',  'Infeed VE046496',  true, 2, NULL, NULL, NULL),
(28, 3, 'VE078317',  'Infeed VE078317',  true, 2, NULL, NULL, NULL),
(29, 3, 'VE033099',  'Infeed VE033099',  true, 2, NULL, NULL, NULL),
(30, 3, 'VE039472',  'Infeed VE039472',  true, 2, NULL, NULL, NULL),
(31, 3, 'VE036791',  'Infeed VE036791',  true, 2, NULL, NULL, NULL),
(32, 3, 'VE045438',  'Infeed VE045438',  true, 2, NULL, 'InfeedSection_VE045438', '/3d/Modules/Infeed/InfeedSection_VE045438.glb'),
(33, 3, 'VE035595',  'Infeed VE035595',  true, 2, NULL, NULL, NULL),
(34, 3, 'VE037995',  'Infeed VE037995',  true, 2, NULL, NULL, NULL),
(35, 3, 'VE036874',  'Infeed VE036874',  true, 2, NULL, NULL, NULL);

-- Infeed product types
-- 63283, 77573, VE047112 → CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(24, 1), (25, 1), (26, 1);
-- VE046496, VE078317, VE033099 → CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(27, 1), (28, 1), (29, 1);
-- VE039472 → BOLSA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(30, 2);
-- VE036791 → BOLSA + CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(31, 1), (31, 2);
-- VE045438, VE035595, VE037995, VE036874 → BOLSA + CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(32, 1), (32, 2), (33, 1), (33, 2), (34, 1), (34, 2), (35, 1), (35, 2);

-- Infeed ↔ Palletizer compatibility
INSERT INTO infeed_palletizer_compatibility (infeed_id, palletizer_id) VALUES
-- 63283, 77573, VE047112 → V-STACK 315 (1), V-STACK 320 (2)
(24, 1), (24, 2), (25, 1), (25, 2), (26, 1), (26, 2),
-- VE046496 → V-STACK 535 (3)
(27, 3),
-- VE078317 → V-STACK 745 (4)
(28, 4),
-- VE033099 → V-STACK 965 (5)
(29, 5),
-- VE039472 → V-STACK 410 (6)
(30, 6),
-- VE036791 → V-STACK 618 (7), V-STACK 620 (8)
(31, 7), (31, 8),
-- VE045438, VE035595, VE037995, VE036874 → V-STACK 630 (9), V-STACK 640 (10)
(32, 9), (32, 10), (33, 9), (33, 10), (34, 9), (34, 10), (35, 9), (35, 10);


-- ============================================
-- MANIPULATORS (component_type_id = 4 = 'manipulator')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(36, 4, '62369',     'Tube Manipulator',  true, 2, NULL, NULL, NULL),
(37, 4, 'VE031821',  'Big Manipulator',   true, 2, NULL, NULL, NULL),
(38, 4, 'VE048852',  'Combi Manipulator', true, 2, NULL, NULL, NULL);

INSERT INTO manipulator_specs (component_id, max_product_width_mm, max_product_length_mm, max_product_weight_kg) VALUES
(36, 530, 770, 25),
(37, 590, 880, 50),
(38, 460, 770, NULL);

-- Tube → BOLSA, Big → BOLSA, Combi → BOLSA + CAJA
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(36, 2), (37, 2), (38, 1), (38, 2);


-- ============================================
-- WRAPPERS (component_type_id = 5 = 'wrapper')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(39, 5, '7500.0051', 'VSW-MB',       true, 1, 8318.00, 'VSW', '/3d/Wrapper/vsw/vsw.glb'),
(40, 5, 'VE051089',  'Wrapper ASM',  true, 1, 58025.00, 'RollerWrapper_VE051089', '/3d/Modules/Wrapper/RollerWrapper_VE051089.glb'),
(41, 5, NULL,         'VAW-1',       true, 1, 77551.00, NULL, NULL),
(42, 5, NULL,         'VAW-1 XL',    true, 1, 77551.00, NULL, NULL),
(43, 5, NULL,         'VAW-2',       true, 1, 68405.00, NULL, NULL),
(44, 5, NULL,         'VAW-2 XL',    true, 1, 68405.00, NULL, NULL),
(45, 5, NULL,         'VAW-3',       true, 1, NULL, NULL, NULL),
(46, 5, 'VE045490',  'VTW',          true, 1, NULL, 'vtw', '/3d/Wrapper/vtw/vtw.glb');

INSERT INTO wrapper_specs (component_id, max_pallet_length_mm, max_pallet_width_mm, max_wrap_height_mm, max_load_kg, wrap_speed_units_per_hour) VALUES
(39, 1250, 1250, 2500, 1750, 20),
(40, 1200, 1000, 2500, 1500, 35),
(41, 1200, 1200, 2500, 1500, 40),
(42, 1200, 1600, 2500, 1500, 40),
(43, 1200, 1200, 2500, 1500, 40),
(44, 1200, 1600, 2500, 1500, 40),
(45, 1200, 1200, 2500, 1500, 60),
(46, 1250, 1350, 2500, 2000, 35);

-- Wrapper transport types
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(39, 3),             -- VSW-MB: NONE
(40, 1),             -- Wrapper ASM: RODILLO
(41, 1), (41, 2),   -- VAW-1: RODILLO + CADENA
(42, 1), (42, 2),   -- VAW-1 XL: RODILLO + CADENA
(43, 1), (43, 2),   -- VAW-2: RODILLO + CADENA
(44, 1), (44, 2),   -- VAW-2 XL: RODILLO + CADENA
(45, 1), (45, 2),   -- VAW-3: RODILLO + CADENA
(46, 1), (46, 2);   -- VTW: RODILLO + CADENA


-- ============================================
-- TURN UNITS (component_type_id = 6 = 'turn_unit')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(47, 6, 'VE045467', 'Turn Unit CC', true, 1, 36000.00, 'TurnUnit_VE045467', '/3d/Modules/Pallet/TurnUnit_VE045467.glb'),
(48, 6, 'VE052849', 'Turn Unit RC', true, 1, 10340.00, 'TurnUnit_VE052849', '/3d/Modules/Pallet/TurnUnit_VE052849.glb');

INSERT INTO turn_unit_specs (component_id, max_pallet_width_mm, max_weight_kg, rotation_direction, rotation_degrees) VALUES
(47, 1350, 650, 'AMBAS', 90),
(48, 1070, 650, 'AMBAS', 90);

INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(47, 2),  -- CC: CADENA
(48, 1);  -- RC: RODILLO


-- ============================================
-- PALLET DISPENSERS (component_type_id = 7 = 'pallet_dispenser')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(49, 7, 'VE045476',  'VPD ASM (Chacabuco)', true, 0, NULL, 'PalletDispenser_VE045476', '/3d/Modules/PalletDispenser/PalletDispenser_VE045476.glb'),
(50, 7, '7200.5004', 'VPM MW',              true, 0, 22784.00, 'PalletDispenser_7200-5004', '/3d/Modules/PalletDispenser/PalletDispenser_7200-5004.glb'),
(51, 7, 'VE038655',  'VPD ASM',             true, 0, 10230.00, 'PalletDispenser_VE038655', '/3d/Modules/PalletDispenser/PalletDispenser_VE038655.glb'),
(52, 7, '7200.0401', 'VPD Fork',            true, 0, 19645.00, 'PalletDispenser_7200-0401', '/3d/Modules/PalletDispenser/PalletDispenser_7200-0401.glb'),
(53, 7, 'VE060979',  'VPD Fork XL',         true, 0, 19645.00, 'PalletDispenser_VE0060979', '/3d/Modules/PalletDispenser/PalletDispenser_VE0060979.glb'),
(54, 7, 'VE027117',  'VPD ASM (Norte)',      true, 0, NULL, 'PalletDispenser_VE027117', '/3d/Modules/PalletDispenser/PalletDispenser_VE027117.glb');

INSERT INTO pallet_dispenser_specs (component_id, max_pallet_length_mm, max_pallet_width_mm, orientation_id, max_stacking_units, max_weight_kg) VALUES
(49, 1200, 1000, 1, 20, 500),  -- DERECHA
(50, 1600, 1200, 3, 20, 500),  -- NONE
(51, 1200, 1000, 2, 20, 500),  -- IZQUIERDA
(52, 1600, 1250, 2, 20, 500),  -- IZQUIERDA
(53, 1940, 1450, 1, 20, 500),  -- DERECHA
(54, 1200, 1000, 2, 20, 500);  -- IZQUIERDA

INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(49, 2),             -- CADENA
(50, 1),             -- RODILLO
(51, 1),             -- RODILLO
(52, 1), (52, 2),   -- RODILLO + CADENA
(53, 1), (53, 2),   -- RODILLO + CADENA
(54, 1);             -- RODILLO


-- ============================================
-- SHEET DISPENSERS (component_type_id = 8 = 'sheet_dispenser')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(55, 8, '7300.1021', 'Sheet Dispenser 7300.1021', true, 0, 14739.00, NULL, NULL),
(56, 8, '7300.1022', 'Sheet Dispenser 7300.1022', true, 0, 12116.00, NULL, NULL),
(57, 8, '7200.5023', 'Sheet Dispenser 7200.5023', true, 0, 13889.00, 'SheetDispenser_7200-5023', '/3d/Modules/SheetDispenser/SheetDispenser_7200-5023.glb'),
(58, 8, 'VE045494',  'Sheet Dispenser VE045494', true, 0, NULL, 'SheetDispenser_VE045494', '/3d/Modules/SheetDispenser/SheetDispenser_VE045494.glb');

INSERT INTO sheet_dispenser_specs (component_id, max_pallet_length_mm, max_pallet_width_mm, orientation_id, max_sheet_stack_mm) VALUES
(55, 1250, 1250, 2, 650),  -- IZQUIERDA
(56, 1800, 1500, 1, 650),  -- DERECHA
(57, 1800, 1500, 1, 650),  -- DERECHA
(58, 1250, 1250, 2, 650);  -- IZQUIERDA

INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(55, 3), -- NONE
(56, 3), -- NONE
(57, 1), -- RODILLO
(58, 2); -- CADENA


-- ============================================
-- END OF LINE (component_type_id = 9 = 'end_of_line', BOLSA only)
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(59, 9, 'VE086516', 'V-LOAD 500',  true, 2, 48255.00, 'v-load_500', '/3d/EndOfLine/v-load_500/v-load_500.glb'),
(60, 9, 'VE089871', 'V-PACK 500',  true, 2, 39665.00, 'v-pack_500', '/3d/EndOfLine/v-pack_500/v-pack_500.glb'),
(61, 9, 'VE089423', 'V-WEIGH 500', true, 2, 38454.00, 'v-weight_500', '/3d/EndOfLine/v-weight_500/v-weight_500.glb');

INSERT INTO end_of_line_specs (component_id, capacity_units_per_min) VALUES
(59, 8), (60, 10), (61, 8);

-- All EndOfLine are BOLSA only
INSERT INTO component_product_types (component_id, product_type_id) VALUES
(59, 2), (60, 2), (61, 2);


-- ============================================
-- COLLARS (component_type_id = 10 = 'collar', no price - included in palletizer)
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(62, 10, 'VE027018', 'Collar Eléctrico',         true, NULL, NULL, NULL, NULL),
(63, 10, '61639',    'Collar Fijo',               true, NULL, NULL, NULL, NULL),
(64, 10, NULL,       'Collar Eléctrico (1 Lado)', true, NULL, NULL, NULL, NULL);

INSERT INTO collar_specs (component_id, max_collar_length_mm, max_collar_width_mm, programmable_sides) VALUES
(62, 1600, 1600, 4),
(63, 1600, 1600, 0),
(64, 1600, 1600, 1);


-- ============================================
-- MAIN FRAMES (component_type_id = 11 = 'main_frame')
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(65, 11, 'VE054362', 'Main Frame VE054362', true, NULL, NULL, NULL, NULL);

INSERT INTO main_frame_specs (component_id, main_frame_length_mm, main_frame_width_mm) VALUES
(65, 1000, 1200);

-- MainFrame supports both transport types and both product types
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES (65, 1), (65, 2);
INSERT INTO component_product_types (component_id, product_type_id) VALUES (65, 1), (65, 2);

-- MainFrame ↔ Palletizer compatibility (V-STACK 620, 630, 640)
INSERT INTO main_frame_palletizer_compatibility (main_frame_id, palletizer_id) VALUES
(65, 8), (65, 9), (65, 10);


-- ============================================
-- CONFIGURATION DATA: Conveyor Accessories
-- ============================================

INSERT INTO conveyor_accessories (id, code, name, transport_type_id, description_key, price_eur) VALUES
(1, 'VE035015',      'Pallet Centre Unit',          1, 'acc.pallet_centre_unit', 0),
(2, 'VE061361',      'Pallet Bottom Board Detection', 1, 'acc.pallet_bottom_board_detection', 0),
(3, 'VE061361',      'Pallet Side Guide',           1, 'acc.pallet_side_guide', 0),
(4, 'VE061361',      'Transition Roller',           1, 'acc.transition_roller', 0),
(5, 'VE061068',      'Turn Unit Transition Rollers', 1, 'acc.turn_unit_transition_rollers', 0),
(6, 'VE061423',      'Crossing Strips',             1, 'acc.crossing_strips', 0),
(7, '5224.0021.01',  'End Stop',                    1, 'acc.end_stop', 0);


-- ============================================
-- CONFIGURATION DATA: Main Frame Configurations
-- ============================================

INSERT INTO main_frame_configurations (main_frame_id, product_type_id, height_mm, lower_collar, integrated_sheet_dispenser, price_eur) VALUES
(65, 2, 2050, true,  true,  0),  -- BOLSA, lower collar, integrated SD
(65, 2, 2050, true,  false, 0),  -- BOLSA, lower collar, no SD
(65, 2, 2050, false, true,  0),  -- BOLSA, no lower collar, integrated SD
(65, 2, 2050, false, false, 0),  -- BOLSA, no lower collar, no SD
(65, 1, 2050, true,  false, 0),  -- CAJA, lower collar, no SD
(65, 1, 2050, false, false, 0);  -- CAJA, no lower collar, no SD


-- ============================================
-- CONFIGURATION DATA: Turn Unit Configurations
-- ============================================

INSERT INTO turn_unit_configurations (turn_unit_id, pallet_brake, pallet_guide, rotation_speed_ms, price_eur) VALUES
(47, true,  true,  0.27, 0),   -- CC with brake + guide
(47, false, false, 0.27, 0),   -- CC without
(48, false, false, 0.27, 0),   -- RC without
(48, true,  false, 0.28, 0),   -- RC with brake
(48, false, true,  0.29, 0);   -- RC with guide


-- ============================================
-- CONFIGURATION DATA: Wrapper Configurations
-- ============================================

INSERT INTO wrapper_configurations (wrapper_id, wrap_type, paper_addition, clamp_type, cut_and_seal, price_eur) VALUES
-- VSW-MB
(39, 'RED',  false, 'BASE', 'NONE', 0),
(39, 'FILM', false, 'BASE', 'NONE', 0),
-- Wrapper ASM
(40, 'RED',  true,  'BASE', 'CU',   0),
(40, 'FILM', true,  'BASE', 'SU',   0),
-- VAW-1
(41, 'RED',  false, 'BASE', 'CU',   0),
(41, 'FILM', false, 'BASE', 'SU',   0),
-- VAW-1 XL
(42, 'RED',  true,  'BASE', 'CU',   0),
(42, 'FILM', true,  'BASE', 'SU',   0),
-- VAW-2
(43, 'RED',  false, 'BASE', 'CU',   0),
(43, 'FILM', false, 'BASE', 'SU',   0),
-- VAW-2 XL
(44, 'RED',  true,  'BASE', 'CU',   0),
(44, 'FILM', true,  'BASE', 'SU',   0),
-- VAW-3
(45, 'RED',  false, 'BASE', 'CU',   0),
(45, 'FILM', false, 'BASE', 'SU',   0),
-- VTW
(46, 'RED',  true,  'BASE', 'CUSR', 0),
(46, 'FILM', true,  'BASE', 'SUSR', 0),
(46, 'RED',  true,  'BASE', 'CULR', 0),
(46, 'FILM', true,  'BASE', 'SULR', 0);


-- ============================================
-- CONFIGURATION DATA: Infeed Coupling Compatibility
-- ============================================

INSERT INTO infeed_coupling_compatibility (coupling_code, infeed_id, available, min_length_mm, min_width_mm, max_length_mm, max_width_mm, price_eur) VALUES
-- VE046970 compatible with VE039472 (30) and VE036791 (31)
('VE046970', 30, true, 1200, 400, 8000, 1000, 0),
('VE046970', 31, true, 1200, 400, 8000, 1000, 0),
-- 63980 compatible with VE036791 (31)
('63980',    31, true, 1200, 400, 1200, 1000, 0),
-- 63549 compatible with VE036791 (31)
('63549',    31, true, 1200, 400, 8000, 1000, 0),
-- VE036214 compatible with many infeeds (all max 1200mm)
('VE036214', 27, true, 1200, 400, 1200, 1000, 0),
('VE036214', 28, true, 1200, 400, 1200, 1000, 0),
('VE036214', 29, true, 1200, 400, 1200, 1000, 0),
('VE036214', 30, true, 1200, 400, 1200, 1000, 0),
('VE036214', 31, true, 1200, 400, 1200, 1000, 0),
('VE036214', 32, true, 1200, 400, 1200, 1000, 0),
('VE036214', 33, true, 1200, 400, 1200, 1000, 0),
('VE036214', 35, true, 1200, 400, 1200, 1000, 0),
-- 61691 compatible with many infeeds (max 8000mm)
('61691', 27, true, 1200, 400, 8000, 1000, 0),
('61691', 28, true, 1200, 400, 8000, 1000, 0),
('61691', 29, true, 1200, 400, 8000, 1000, 0),
('61691', 30, true, 1200, 400, 8000, 1000, 0),
('61691', 31, true, 1200, 400, 8000, 1000, 0),
('61691', 32, true, 1200, 400, 8000, 1000, 0),
('61691', 33, true, 1200, 400, 8000, 1000, 0),
('61691', 35, true, 1200, 400, 8000, 1000, 0),
-- 64165 compatible with many infeeds (max 8000mm)
('64165', 27, true, 1200, 400, 8000, 1000, 0),
('64165', 28, true, 1200, 400, 8000, 1000, 0),
('64165', 29, true, 1200, 400, 8000, 1000, 0),
('64165', 30, true, 1200, 400, 8000, 1000, 0),
('64165', 31, true, 1200, 400, 8000, 1000, 0),
('64165', 32, true, 1200, 400, 8000, 1000, 0),
('64165', 33, true, 1200, 400, 8000, 1000, 0),
('64165', 35, true, 1200, 400, 8000, 1000, 0);


-- ============================================
-- ACCESSORY & SAFETY NEW COMPONENTS (IDs 66+)
-- ============================================

INSERT INTO components (id, component_type_id, code, name, available, location_id, price_eur, model_id, model_path) VALUES
(66, 12, 'VE052181', 'Light Curtain Access Protection', true, NULL, NULL, 'LightCurtainAccessProtection_VE052181', '/3d/Modules/Safety/LightCurtainAccessProtection_VE052181.glb'),
(67, 12, 'VE052181', 'Light Curtain', true, NULL, NULL, 'LightCurtain_VE052181', '/3d/Modules/Safety/LightCurtain_VE052181.glb'),
(68, 12, 'VE52199', 'Light Curtain VE52199', true, NULL, NULL, 'LightCurtain_VE52199', '/3d/Modules/Safety/LightCurtain_VE52199.glb'),
(69, 12, 'VE054396', 'Safety Fencing', true, NULL, NULL, 'SafetyFencing_VE054396', '/3d/Modules/Safety/SafetyFencing_VE054396.glb'),
(70, 13, 'VE033540', 'Platform VE033540', true, NULL, NULL, 'Plataform_VE033540', '/3d/Modules/Safety/Plataform_VE033540.glb'),
(71, 13, 'VE045468', 'Platform VE045468', true, NULL, NULL, 'Plataform_VE045468', '/3d/Modules/Safety/Plataform_VE045468.glb'),
(72, 13, 'VE055250', 'Platform VE055250', true, NULL, NULL, 'Plataform_VE055250', '/3d/Modules/Safety/Plataform_VE055250.glb'),
(73, 14, 'VE055206', 'Bridge VE055206', true, NULL, NULL, 'Bridge_VE055206', '/3d/Modules/SupportFrame/Bridge_VE055206.glb'),
(74, 14, 'VE023968', 'Infeed Section VE023968', true, NULL, NULL, 'InfeedSection_VE023968', '/3d/Modules/SupportFrame/InfeedSection_VE023968.glb'),
(75, 14, 'VE045438', 'Infeed Section VE045438 (Support)', true, NULL, NULL, 'InfeedSection_VE045438_SF', '/3d/Modules/SupportFrame/InfeedSection_VE045438.glb'),
(76, 14, 'VE024277', 'Support Frame VE024277', true, NULL, NULL, 'SupportFrame_VE024277', '/3d/Modules/ProductTransport/SupportFrame_VE024277.glb'),
(77, 2, 'VE025863', 'Conveyor VE025863', true, NULL, NULL, 'Conveyor_VE025863', '/3d/Modules/Conveyor/Conveyor_VE025863.glb'),
(78, 2, 'VE055303', 'Conveyor VE055303', true, NULL, NULL, 'Conveyor_VE055303', '/3d/Modules/Conveyor/Conveyor_VE055303.glb'),
(79, 2, 'VE54815', 'Conveyor VE54815', true, NULL, NULL, 'Conveyor_VE54815', '/3d/Modules/Conveyor/Conveyor_VE54815.glb'),
(80, 3, 'VE026505', 'Infeed Section VE026505', true, NULL, NULL, 'InfeedSection_VE026505', '/3d/Modules/Infeed/InfeedSection_VE026505.glb'),
(81, 5, '7500.2101', 'VAW Wrapper 7500.2101', true, NULL, NULL, 'VAWWrapper_7500-2101', '/3d/Modules/Wrapper/VAWWrapper_7500-2101.glb');

-- New components product and transport types compatibility (Universal: RODILLO & CADENA, CAJA & BOLSA)
INSERT INTO component_transport_types (component_id, transport_type_id) VALUES
(66, 1), (66, 2),
(67, 1), (67, 2),
(68, 1), (68, 2),
(69, 1), (69, 2),
(70, 1), (70, 2),
(71, 1), (71, 2),
(72, 1), (72, 2),
(73, 1), (73, 2),
(74, 1), (74, 2),
(75, 1), (75, 2),
(76, 1), (76, 2),
(77, 1), (77, 2),
(78, 1), (78, 2),
(79, 1), (79, 2),
(80, 1), (80, 2),
(81, 1), (81, 2);

INSERT INTO component_product_types (component_id, product_type_id) VALUES
(66, 1), (66, 2),
(67, 1), (67, 2),
(68, 1), (68, 2),
(69, 1), (69, 2),
(70, 1), (70, 2),
(71, 1), (71, 2),
(72, 1), (72, 2),
(73, 1), (73, 2),
(74, 1), (74, 2),
(75, 1), (75, 2),
(76, 1), (76, 2),
(77, 1), (77, 2),
(78, 1), (78, 2),
(79, 1), (79, 2),
(80, 1), (80, 2),
(81, 1), (81, 2);

-- Reset sequence to avoid conflicts with future inserts
SELECT setval('components_id_seq', (SELECT MAX(id) FROM components));

COMMIT;
