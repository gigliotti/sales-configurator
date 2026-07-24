-- ============================================================================
-- Migración 20260724110000: Asignar los modelos 3D faltantes del catálogo
-- ============================================================================
-- Auditoría del catálogo contra la planilla maestra de Verbruggen y contra los
-- archivos .glb del repositorio (public/3d/) — ver docs/CATALOGO.md.
--
-- HALLAZGO PRINCIPAL: 7 de las 10 paletizadoras tenían model_path = NULL
-- aunque su archivo .glb SÍ existe en el repo. En el editor 3D esas máquinas
-- se dibujaban como una caja gris de reemplazo en lugar del modelo real.
-- Lo mismo ocurría con el wrapper VAW-1.
--
-- Esta migración solo hace UPDATE de model_id / model_path: no crea, borra ni
-- modifica componentes, specs ni compatibilidades (esas ya coinciden con la
-- planilla; ver la verificación documentada en docs/CATALOGO.md).
--
-- Idempotente: puede re-ejecutarse sin efectos adicionales.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────
-- § 1  Paletizadoras (match por código ERP)
-- ────────────────────────────────────────────
-- code ↔ archivo verificados uno a uno contra public/3d/Palletizer/.

UPDATE components SET model_id = 'v-stack_315', model_path = '/3d/Palletizer/v-stack_315.glb'
  WHERE code = 'VE069108' AND model_path IS NULL;   -- V-STACK 315

UPDATE components SET model_id = 'v-stack_320', model_path = '/3d/Palletizer/v-stack_320.glb'
  WHERE code = 'VE052439' AND model_path IS NULL;   -- V-STACK 320

UPDATE components SET model_id = 'v-stack_618', model_path = '/3d/Palletizer/v-stack_618.glb'
  WHERE code = 'VE073550' AND model_path IS NULL;   -- V-STACK 618

UPDATE components SET model_id = 'v-stack_620', model_path = '/3d/Palletizer/v-stack_620.glb'
  WHERE code = 'VE060827' AND model_path IS NULL;   -- V-STACK 620

UPDATE components SET model_id = 'v-stack_640', model_path = '/3d/Palletizer/v-stack_640.glb'
  WHERE code = 'VE090533' AND model_path IS NULL;   -- V-STACK 640

UPDATE components SET model_id = 'v-stack_965', model_path = '/3d/Palletizer/v-stack_965.glb'
  WHERE code = 'VE047011' AND model_path IS NULL;   -- V-STACK 965

-- ATENCIÓN: v-stack_745.glb pesa 110 MB (el resto del catálogo entero suma
-- ~150 MB). Se asigna porque es el modelo correcto, pero DEBE optimizarse
-- antes de exponerlo a vendedores: hoy implica una descarga de 110 MB al
-- seleccionar esta máquina. Ver docs/CATALOGO.md § "Deuda técnica".
UPDATE components SET model_id = 'v-stack_745', model_path = '/3d/Palletizer/v-stack_745.glb'
  WHERE code = 'VE072508' AND model_path IS NULL;   -- V-STACK 745

-- ────────────────────────────────────────────
-- § 2  Wrapper VAW-1 (match por nombre)
-- ────────────────────────────────────────────
-- Los wrappers VAW-* no tienen código ERP en la planilla (figuran como "-"),
-- por eso el match es por nombre. Solo VAW-1 tiene modelo 3D disponible.

UPDATE components SET model_id = 'vaw-_1', model_path = '/3d/Wrapper/vaw-_1/vaw-_1.glb'
  WHERE name = 'VAW-1'
    AND component_type_id = (SELECT id FROM component_types WHERE name = 'wrapper')
    AND model_path IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecutar tras aplicar; debe devolver 0 filas)
--
--   SELECT c.code, c.name
--   FROM components c
--   JOIN component_types t ON t.id = c.component_type_id
--   WHERE t.name = 'palletizer' AND c.model_path IS NULL;
--
-- ============================================================================
