-- ============================================
-- Secure get_active_profile_id() function
-- ============================================

CREATE OR REPLACE FUNCTION get_active_profile_id()
RETURNS UUID AS $$
DECLARE
  v_uid UUID;
  v_role VARCHAR(20);
  v_header_val TEXT;
  v_header_id UUID;
BEGIN
  v_uid := auth.uid();
  
  -- Extract header safely
  BEGIN
    v_header_val := current_setting('request.headers', true)::json->>'x-active-profile-id';
  EXCEPTION WHEN OTHERS THEN
    v_header_val := NULL;
  END;

  IF v_header_val IS NOT NULL AND v_header_val <> '' THEN
    BEGIN
      v_header_id := v_header_val::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_header_id := NULL;
    END;
  ELSE
    v_header_id := NULL;
  END IF;

  IF v_uid IS NOT NULL THEN
    -- User is genuinely logged in via GoTrue
    SELECT role INTO v_role FROM public.user_profiles WHERE id = v_uid;
    IF v_role = 'admin' AND v_header_id IS NOT NULL THEN
      RETURN v_header_id;
    ELSE
      RETURN v_uid;
    END IF;
  ELSE
    -- Never fall back to header override for unauthenticated public requests in production
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_active_profile_id() TO PUBLIC;
