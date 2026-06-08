-- ============================================
-- Migration 009: Fix Unique Index on Conveyor Accessories
-- ============================================
-- Dropping the unique index on code because multiple accessories
-- (e.g., bottom board detection, side guides, transition rollers)
-- share the same product code (VE061361).
-- ============================================

DROP INDEX IF EXISTS uq_conveyor_accessories_code;
CREATE INDEX IF NOT EXISTS idx_conveyor_accessories_code ON conveyor_accessories(code);
