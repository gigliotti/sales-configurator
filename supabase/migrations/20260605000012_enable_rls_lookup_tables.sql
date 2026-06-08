-- ============================================
-- Migration 012: Enable RLS on Lookup Tables
-- ============================================
-- Enforce Row Level Security on lookup/enum tables.
-- Readers: authenticated
-- Writers: admin only
-- ============================================

-- Enable RLS
ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_types ENABLE ROW LEVEL SECURITY;

-- Select policies (read-only for authenticated users)
CREATE POLICY component_types_read ON public.component_types FOR SELECT TO authenticated USING (true);
CREATE POLICY connection_types_read ON public.connection_types FOR SELECT TO authenticated USING (true);
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY orientations_read ON public.orientations FOR SELECT TO authenticated USING (true);
CREATE POLICY product_types_read ON public.product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY transport_types_read ON public.transport_types FOR SELECT TO authenticated USING (true);

-- Admin CRUD policies
CREATE POLICY component_types_admin ON public.component_types FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY connection_types_admin ON public.connection_types FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY locations_admin ON public.locations FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY orientations_admin ON public.orientations FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY product_types_admin ON public.product_types FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY transport_types_admin ON public.transport_types FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
