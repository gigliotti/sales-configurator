-- ============================================================================
-- Migración 20260724100500: Neutralizar las cuentas semilla del mock login
-- ============================================================================
-- La migración 014 creó usuarios reales en auth.users con contraseña conocida
-- ('password123'): admin@example.com (00000000-...), seller1@example.com
-- (11111111-...) y seller2@example.com (22222222-...). Tras eliminar el bypass
-- por header (20260724100000), esas credenciales seguían siendo un backdoor
-- con rol admin/seller real.
--
-- IMPORTANTE: NO se borran las cuentas. Durante la fase de demo, los proyectos
-- se crearon con owner_id de estos perfiles; un DELETE con FK ON DELETE CASCADE
-- destruiría esos proyectos y su historial. En su lugar:
--   1. Se les asigna una contraseña aleatoria irrecuperable (bloquea el login
--      por password conocida sin tocar datos).
--   2. Queda documentado que, tras migrar los proyectos a dueños reales
--      (UPDATE projects SET owner_id = ...), estas cuentas pueden eliminarse.
-- ============================================================================

BEGIN;

-- pgcrypto vive en el esquema "extensions" en Supabase: se califica explícitamente.
UPDATE auth.users
SET encrypted_password = extensions.crypt(
      gen_random_uuid()::text || gen_random_uuid()::text,
      extensions.gen_salt('bf')
    )
WHERE id IN (
  '00000000-0000-0000-0000-000000000000',  -- admin@example.com
  '11111111-1111-1111-1111-111111111111',  -- seller1@example.com
  '22222222-2222-2222-2222-222222222222'   -- seller2@example.com
);

COMMENT ON TABLE public.user_profiles IS
  'Perfiles de usuario. Los perfiles 000.../111.../222... provienen del mock '
  'login histórico: sus credenciales fueron neutralizadas en la migración '
  '20260724100500. Reasignar sus proyectos a cuentas reales antes de borrarlos.';

COMMIT;
