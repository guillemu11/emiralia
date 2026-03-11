-- ============================================================
-- Migración: Sistema de fases para Inbox Items
-- chat → borrador → proyecto
-- ============================================================

-- 1. Nueva columna para resumen del borrador
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. Migrar datos existentes (ANTES de cambiar constraint)
UPDATE inbox_items SET status = 'chat' WHERE status IN ('draft', 'reviewing');
UPDATE inbox_items SET status = 'borrador' WHERE status = 'approved';
UPDATE inbox_items SET status = 'proyecto' WHERE status = 'assigned';

-- 3. Actualizar constraint de status
ALTER TABLE inbox_items DROP CONSTRAINT IF EXISTS inbox_items_status_check;
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_status_check
    CHECK (status IN ('chat', 'borrador', 'proyecto', 'discarded'));

-- 4. Actualizar default
ALTER TABLE inbox_items ALTER COLUMN status SET DEFAULT 'chat';
