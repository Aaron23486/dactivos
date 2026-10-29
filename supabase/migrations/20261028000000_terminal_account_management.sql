-- Gestión de cuentas desde la terminal del servidor (npm run users / create-admin / demo:setup); FR-12, D7.
-- Cambia el perfil de acceso y escribe la auditoría en la misma transacción. Detrás de estos comandos
-- no hay un usuario de la app, así que actor_user_id es NULL y el nombre del evento dice de dónde vino.
-- Solo service_role (scripts del servidor) puede ejecutarla; anon y authenticated no.
BEGIN;

CREATE FUNCTION public.dactivos_terminal_set_access(
  p_user_id uuid,
  p_role text,
  p_is_active boolean,
  p_reason text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_old_role text;
  v_old_active boolean;
  v_reason text := btrim(p_reason);
  v_exists boolean;
BEGIN
  IF p_user_id IS NULL
     OR p_role IS NULL OR p_role NOT IN ('ADMIN', 'SECURITY')
     OR p_is_active IS NULL
     OR v_reason IS NULL OR length(v_reason) NOT BETWEEN 10 AND 500 OR v_reason ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'Datos de acceso invalidos' USING ERRCODE = '22023';
  END IF;

  -- El mismo bloqueo que las RPC de acceso de la app: los cambios de cuentas se serializan.
  PERFORM pg_catalog.pg_advisory_xact_lock(706, 2026);

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Identidad Auth inexistente' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role::text, p.is_active, true
    INTO v_old_role, v_old_active, v_exists
    FROM public.profiles AS p
   WHERE p.user_id = p_user_id
   FOR UPDATE;

  IF v_exists AND v_old_role = p_role AND v_old_active = p_is_active THEN
    RETURN false;
  END IF;

  -- Nunca dejar el sistema sin un administrador activo.
  IF v_exists AND v_old_role = 'ADMIN' AND v_old_active
     AND (p_role <> 'ADMIN' OR NOT p_is_active)
     AND (SELECT count(*) FROM public.profiles WHERE role = 'ADMIN' AND is_active) <= 1
  THEN
    RAISE EXCEPTION 'No se puede retirar el ultimo ADMIN activo' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.profiles (user_id, role, is_active)
  VALUES (p_user_id, p_role::public.app_role, p_is_active)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;

  INSERT INTO public.admin_audit_log
    (actor_user_id, target_user_id, event_type, reason, previous_state, new_state)
  VALUES (
    NULL,
    p_user_id,
    CASE WHEN v_exists THEN 'TERMINAL_ACCESS_CHANGED' ELSE 'TERMINAL_ACCOUNT_CREATED' END,
    v_reason,
    CASE WHEN v_exists
      THEN jsonb_build_object('role', v_old_role, 'is_active', v_old_active)
    END,
    jsonb_build_object('role', p_role, 'is_active', p_is_active)
  );

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.dactivos_terminal_set_access(uuid, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_terminal_set_access(uuid, text, boolean, text)
  TO service_role;

COMMIT;
