-- The role is granted only while the token's Auth session exists (R13, D12).
-- Access tokens are verified by signature and expiry alone, so after a sign-out or a revoked
-- session a copied token kept working against the RPCs until it expired. Every function checks
-- the role through current_app_role(), so requiring a live session here closes that window.
BEGIN;

CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.role::text
  FROM public.profiles AS p
  WHERE p.user_id = (SELECT auth.uid())
    AND p.is_active = true
    AND EXISTS (
      SELECT 1
      FROM auth.sessions AS s
      WHERE s.id = ((SELECT auth.jwt()) ->> 'session_id')::uuid
        AND s.user_id = p.user_id
        AND (s.not_after IS NULL OR s.not_after > now())
    )
  LIMIT 1;
$function$;

-- CREATE OR REPLACE keeps the existing grants; restated so the file reads on its own.
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

COMMIT;
