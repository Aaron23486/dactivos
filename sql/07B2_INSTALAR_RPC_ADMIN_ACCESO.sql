-- DACTIVOS 07B-2. Ejecutar SOLO en el proyecto Supabase dactivos-demo.
-- Crea una RPC de escritura auditada; no cambia usuarios existentes al instalarse.
-- Requisitos: 07B-1 instalada y esquema profiles/admin_audit_log verificado.
BEGIN;

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='dactivos_admin_set_user_access'
  ) THEN
    RAISE EXCEPTION 'Ya existe una RPC con este nombre. Revisar antes de instalar.';
  END IF;
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.admin_audit_log') IS NULL
     OR to_regprocedure('public.current_app_role()') IS NULL THEN
    RAISE EXCEPTION 'Falta una dependencia. No se creara la RPC.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    LEFT JOIN pg_catalog.pg_attrdef d
      ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.admin_audit_log'::regclass
      AND a.attname='id' AND NOT a.attisdropped
      AND (a.attidentity IN ('a','d') OR d.oid IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'admin_audit_log.id no tiene generador confirmado. Revisar esquema.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid=e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='app_role' AND e.enumlabel='ADMIN'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid=e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='app_role' AND e.enumlabel='SECURITY'
  ) THEN
    RAISE EXCEPTION 'El enum de roles no coincide con ADMIN y SECURITY.';
  END IF;
END;
$guard$;

CREATE FUNCTION public.dactivos_admin_set_user_access(
  p_user_id uuid,
  p_role text,
  p_is_active boolean,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $rpc$
DECLARE
  v_actor uuid;
  v_old_role text;
  v_old_active boolean;
  v_reason text;
  v_admin_count bigint;
BEGIN
  v_actor := (SELECT auth.uid());
  IF v_actor IS NULL
     OR public.current_app_role() IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501';
  END IF;

  v_reason := btrim(p_reason);
  IF p_user_id IS NULL
     OR p_role IS NULL
     OR p_role NOT IN ('ADMIN','SECURITY')
     OR p_is_active IS NULL
     OR v_reason IS NULL
     OR length(v_reason) NOT BETWEEN 10 AND 500
     OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Parametros administrativos invalidos' USING ERRCODE='22023';
  END IF;

  -- No permitir que el administrador modifique su propio acceso.
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'No se puede modificar la propia cuenta'
      USING ERRCODE='23514';
  END IF;

  -- Serializa TODAS las operaciones de administración de roles hechas por esta RPC.
  -- Evita que dos administradores desactiven simultáneamente los últimos ADMIN.
  PERFORM pg_catalog.pg_advisory_xact_lock(706, 2026);

  SELECT p.role::text, p.is_active
    INTO v_old_role, v_old_active
  FROM public.profiles p
  WHERE p.user_id=p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inexistente; vincularlo requiere proceso separado'
      USING ERRCODE='P0002';
  END IF;

  -- No habilitar una cuenta cuyo correo no esté confirmado por Auth.
  IF p_is_active AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id=p_user_id AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Se requiere correo confirmado para habilitar acceso'
      USING ERRCODE='23514';
  END IF;

  IF v_old_role IS NOT DISTINCT FROM p_role
     AND v_old_active IS NOT DISTINCT FROM p_is_active THEN
    RETURN false; -- Sin UPDATE ni evento ficticio de auditoría.
  END IF;

  IF v_old_role='ADMIN' AND v_old_active=true
     AND (p_role <> 'ADMIN' OR p_is_active=false) THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles p
    WHERE p.role='ADMIN'::public.app_role
      AND p.is_active=true;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'No se puede desactivar al ultimo ADMIN'
        USING ERRCODE='23514';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role=p_role::public.app_role,
      is_active=p_is_active,
      updated_at=statement_timestamp()
  WHERE user_id=p_user_id;

  INSERT INTO public.admin_audit_log (
    actor_user_id, target_user_id, event_type, reason,
    previous_state, new_state
  ) VALUES (
    v_actor, p_user_id, 'USER_ACCESS_UPDATED', v_reason,
    jsonb_build_object('role',v_old_role,'is_active',v_old_active),
    jsonb_build_object('role',p_role,'is_active',p_is_active)
  );

  RETURN true;
END;
$rpc$;

REVOKE ALL ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) FROM anon;
REVOKE ALL ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) TO authenticated;
COMMIT;

-- Comprobación de metadatos; NO devuelve nombres, correos ni datos personales.
SELECT
  p.prosecdef AS security_definer,
  p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute
FROM pg_catalog.pg_proc p
WHERE p.oid=to_regprocedure('public.dactivos_admin_set_user_access(uuid,text,boolean,text)');
