-- El rol se concede solo mientras exista la sesión de Auth del token (R13, D12).
-- Los tokens de acceso se verifican solo por firma y vencimiento, así que tras cerrar o revocar la
-- sesión un token copiado seguía funcionando con las RPC hasta vencer. Todas las funciones comprueban
-- el rol con current_app_role(), así que exigir aquí una sesión viva cierra esa ventana.
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

-- CREATE OR REPLACE conserva los permisos; se repiten para que el archivo se entienda solo.
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

COMMIT;
