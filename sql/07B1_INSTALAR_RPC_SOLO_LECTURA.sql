-- DACTIVOS 07B-1 — DIRECTORIO DE USUARIOS (UNICA BD EXISTENTE)
-- Instalar en SQL Editor como propietario privilegiado del proyecto dactivos-demo.
-- Solo agrega UNA RPC de lectura. No modifica auth.users, profiles ni registros.
-- No ejecutar si la RPC ya existe: se detendrá sin sobrescribirla.
BEGIN;
DO $guard$
BEGIN
  IF to_regprocedure('public.dactivos_admin_list_users()') IS NOT NULL THEN
    RAISE EXCEPTION 'dactivos_admin_list_users() ya existe; revisar antes de reemplazar';
  END IF;
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Falta public.profiles; instalacion detenida';
  END IF;
END
$guard$;

CREATE FUNCTION public.dactivos_admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $rpc$
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR public.current_app_role() IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(visible_user) ORDER BY visible_user.created_at DESC, visible_user.id DESC)
    FROM (
      SELECT
        u.id,
        u.email,
        p.role::text AS role,
        p.is_active,
        (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
        u.created_at,
        u.last_sign_in_at
      FROM auth.users AS u
      LEFT JOIN public.profiles AS p ON p.user_id = u.id
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT 500
    ) AS visible_user
  ), '[]'::jsonb);
END;
$rpc$;

REVOKE ALL ON FUNCTION public.dactivos_admin_list_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dactivos_admin_list_users() FROM anon;
REVOKE ALL ON FUNCTION public.dactivos_admin_list_users() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_list_users() TO authenticated;
COMMIT;

-- Inspeccion de permisos (no muestra informacion de usuarios):
SELECT
  p.prosecdef AS security_definer,
  p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute
FROM pg_catalog.pg_proc p
WHERE p.oid = to_regprocedure('public.dactivos_admin_list_users()');
