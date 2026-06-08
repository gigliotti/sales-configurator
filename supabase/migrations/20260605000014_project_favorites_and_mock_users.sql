-- ============================================
-- Migration 014: Project Favorites and Mock Users
-- ============================================
-- 1. Create seller_favorite_projects table
-- 2. Enable RLS and setup policies
-- 3. Provision mock user accounts for testing
-- ============================================

BEGIN;

-- --------------------------------------------
-- 1. Create Favorites Table
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_favorite_projects (
    seller_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (seller_id, project_id)
);

-- Enable RLS
ALTER TABLE public.seller_favorite_projects ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 2. Define RLS Policies
-- --------------------------------------------
-- Admin: full CRUD
DROP POLICY IF EXISTS seller_favorite_projects_admin_all ON public.seller_favorite_projects;
CREATE POLICY seller_favorite_projects_admin_all
  ON public.seller_favorite_projects FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Seller: manage own favorites
DROP POLICY IF EXISTS seller_favorite_projects_seller_all ON public.seller_favorite_projects;
CREATE POLICY seller_favorite_projects_seller_all
  ON public.seller_favorite_projects FOR ALL TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Anon / Client: read access (needed if browsing catalog/lobby)
DROP POLICY IF EXISTS seller_favorite_projects_anon_read ON public.seller_favorite_projects;
CREATE POLICY seller_favorite_projects_anon_read
  ON public.seller_favorite_projects FOR SELECT TO anon
  USING (true);

-- --------------------------------------------
-- 3. Provision Mock Auth Users & Profiles
-- --------------------------------------------

-- Enable pgcrypto for password hashing if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Update admin@example.com password to 'password123'
UPDATE auth.users 
SET 
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  aud = 'authenticated',
  role = 'authenticated'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Insert seller1@example.com (Vendedor Carlos)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'seller1@example.com', 
  extensions.crypt('password123', extensions.gen_salt('bf')), 
  now(), 
  'authenticated', 
  'authenticated', 
  '{"provider":"email","providers":["email"]}'::jsonb, 
  '{}'::jsonb, 
  false
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email = 'seller1@example.com';

INSERT INTO public.user_profiles (id, name, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'Vendedor Carlos', 'seller')
ON CONFLICT (id) DO UPDATE SET name = 'Vendedor Carlos', role = 'seller';

-- Insert seller2@example.com (Vendedora Ana)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES (
  '22222222-2222-2222-2222-222222222222', 
  'seller2@example.com', 
  extensions.crypt('password123', extensions.gen_salt('bf')), 
  now(), 
  'authenticated', 
  'authenticated', 
  '{"provider":"email","providers":["email"]}'::jsonb, 
  '{}'::jsonb, 
  false
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email = 'seller2@example.com';

INSERT INTO public.user_profiles (id, name, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'Vendedora Ana', 'seller')
ON CONFLICT (id) DO UPDATE SET name = 'Vendedora Ana', role = 'seller';

COMMIT;
