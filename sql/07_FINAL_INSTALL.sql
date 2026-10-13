-- DACTIVOS 07-FINAL | UNICA BASE dactivos-demo
-- Instalar DESPUÉS del paquete local, en SQL Editor con permisos owner.
-- No inserta, modifica ni borra activos/usuarios existentes al instalar.
-- Nueva tabla de motivos de baja/reactivación; nuevas RPC de consulta, reporte e invitación.
BEGIN;
DO $pre$
BEGIN
 IF to_regprocedure('public.dactivos_list_audit_events(integer,integer)') IS NOT NULL
 OR to_regprocedure('public.dactivos_admin_report_page(text,integer,integer)') IS NOT NULL
 OR to_regprocedure('public.dactivos_admin_change_asset_lifecycle(uuid,boolean,text)') IS NOT NULL
 OR to_regprocedure('public.dactivos_admin_link_invited_user(uuid,text,text)') IS NOT NULL
 OR to_regclass('public.asset_lifecycle_log') IS NOT NULL
 THEN RAISE EXCEPTION '07-FINAL ya está instalado o hay conflictos. Detener, no sobrescribir.';
 END IF;
 IF to_regprocedure('public.dactivos_guard_asset_status()') IS NULL
 OR to_regclass('public.assets') IS NULL OR to_regclass('public.asset_assignments') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL
 THEN RAISE EXCEPTION 'Faltan dependencias de DACTIVOS.';
 END IF;
 IF position('Transicion de estado no autorizada' in pg_get_functiondef('public.dactivos_guard_asset_status()'::regprocedure))=0
 THEN RAISE EXCEPTION 'Guard actual distinto del contrato revisado. No actualizar.'; END IF;
END; $pre$;

CREATE TABLE public.asset_lifecycle_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 previous_status public.asset_status NOT NULL,
 new_status public.asset_status NOT NULL,
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 500 AND reason !~ '[[:cntrl:]]'),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lifecycle_status_pairs CHECK (
  (previous_status='AVAILABLE' AND new_status='RETIRED') OR
  (previous_status='RETIRED' AND new_status='AVAILABLE')
 )
);
ALTER TABLE public.asset_lifecycle_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.asset_lifecycle_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.asset_lifecycle_log_id_seq FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.dactivos_guard_lifecycle_log() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $f$
BEGIN
 RAISE EXCEPTION 'El historial de bajas y reactivaciones es inmutable' USING ERRCODE='23514';
END; $f$;
CREATE TRIGGER lifecycle_immutable BEFORE UPDATE OR DELETE ON public.asset_lifecycle_log
 FOR EACH ROW EXECUTE FUNCTION public.dactivos_guard_lifecycle_log();

-- Se preserva íntegramente la protección previa de entrega/devolución/liberación.

CREATE OR REPLACE FUNCTION public.dactivos_guard_asset_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Entrega.
  IF OLD.status =
       'AVAILABLE'::public.asset_status
     AND NEW.status =
       'ASSIGNED'::public.asset_status
     AND EXISTS (
       SELECT 1
       FROM public.asset_assignments aa
       WHERE aa.asset_id = NEW.id
         AND aa.returned_at IS NULL
     )
  THEN
    RETURN NEW;
  END IF;

  -- Devolucion.
  IF OLD.status =
       'ASSIGNED'::public.asset_status
     AND NEW.status IN (
       'AVAILABLE'::public.asset_status,
       'MAINTENANCE'::public.asset_status
     )
     AND EXISTS (
       SELECT 1
       FROM public.asset_assignments aa
       JOIN public.asset_return_inspections ri
         ON ri.assignment_id = aa.id
       WHERE aa.id = (
         SELECT aa2.id
         FROM public.asset_assignments aa2
         WHERE aa2.asset_id = NEW.id
         ORDER BY
           aa2.assigned_at DESC,
           aa2.id DESC
         LIMIT 1
       )
       AND aa.returned_at IS NOT NULL
       AND (
         (
           ri.condition = 'GOOD'
           AND NEW.status =
             'AVAILABLE'::public.asset_status
         )
         OR
         (
           ri.condition = 'DAMAGED'
           AND NEW.status =
             'MAINTENANCE'::public.asset_status
         )
       )
       AND NOT EXISTS (
         SELECT 1
         FROM public.asset_assignments open_aa
         WHERE open_aa.asset_id = NEW.id
           AND open_aa.returned_at IS NULL
       )
     )
  THEN
    RETURN NEW;
  END IF;

  -- Liberacion posterior a mantenimiento.
  IF OLD.status =
       'MAINTENANCE'::public.asset_status
     AND NEW.status =
       'AVAILABLE'::public.asset_status
     AND NOT EXISTS (
       SELECT 1
       FROM public.asset_maintenance_cases mc
       WHERE mc.asset_id = NEW.id
         AND mc.status = 'OPEN'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.asset_assignments aa
       WHERE aa.asset_id = NEW.id
         AND aa.returned_at IS NULL
     )
     AND EXISTS (
       SELECT 1
       FROM public.asset_release_validations rv
       JOIN public.asset_maintenance_cases mc
         ON mc.id = rv.source_case_id
       WHERE rv.asset_id = NEW.id
         AND mc.asset_id = NEW.id
         AND mc.status = 'RESOLVED'
         AND mc.id = (
           SELECT latest.id
           FROM public.asset_maintenance_cases latest
           WHERE latest.asset_id = NEW.id
           ORDER BY
             latest.opened_at DESC,
             latest.id DESC
           LIMIT 1
         )
         AND NOT EXISTS (
           SELECT 1
           FROM public.asset_release_consumptions c
           WHERE c.validation_id = rv.id
         )
     )
  THEN
    RETURN NEW;
  END IF;

  -- 07-FINAL: transiciones administrativas exclusivas y controladas.
  IF (SELECT auth.uid()) IS NOT NULL
     AND public.current_app_role() = 'ADMIN'
     AND (
       (OLD.status='AVAILABLE'::public.asset_status AND NEW.status='RETIRED'::public.asset_status)
       OR
       (OLD.status='RETIRED'::public.asset_status AND NEW.status='AVAILABLE'::public.asset_status)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.asset_assignments aa
       WHERE aa.asset_id=NEW.id AND aa.returned_at IS NULL
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.asset_maintenance_cases mc
       WHERE mc.asset_id=NEW.id AND mc.status='OPEN'
     )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Transicion de estado no autorizada'
    USING ERRCODE = '23514';
END;
$function$;


CREATE FUNCTION public.dactivos_admin_change_asset_lifecycle(
 p_asset_id uuid, p_reactivate boolean, p_reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $f$
DECLARE v_actor uuid; v_old public.asset_status; v_new public.asset_status; v_reason text;
BEGIN
 v_actor:=(SELECT auth.uid());
 IF v_actor IS NULL OR public.current_app_role() IS DISTINCT FROM 'ADMIN' THEN
  RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501'; END IF;
 v_reason:=btrim(p_reason);
 IF p_asset_id IS NULL OR p_reactivate IS NULL OR v_reason IS NULL
 OR length(v_reason) NOT BETWEEN 10 AND 500 OR v_reason ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Datos de baja/reactivacion invalidos' USING ERRCODE='22023'; END IF;
 SELECT status INTO v_old FROM public.assets WHERE id=p_asset_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Activo inexistente' USING ERRCODE='P0002'; END IF;
 v_new:=CASE WHEN p_reactivate THEN 'AVAILABLE'::public.asset_status ELSE 'RETIRED'::public.asset_status END;
 IF v_old=v_new THEN RETURN false; END IF;
 IF (p_reactivate AND v_old<>'RETIRED') OR (NOT p_reactivate AND v_old<>'AVAILABLE') THEN
  RAISE EXCEPTION 'Estado de origen incompatible' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.asset_assignments WHERE asset_id=p_asset_id AND returned_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.asset_maintenance_cases WHERE asset_id=p_asset_id AND status='OPEN') THEN
  RAISE EXCEPTION 'Movimientos pendientes' USING ERRCODE='23514'; END IF;
 UPDATE public.assets SET status=v_new WHERE id=p_asset_id;
 INSERT INTO public.asset_lifecycle_log(asset_id,actor_user_id,previous_status,new_status,reason)
 VALUES(p_asset_id,v_actor,v_old,v_new,v_reason);
 RETURN true;
END; $f$;

CREATE FUNCTION public.dactivos_admin_link_invited_user(
 p_user_id uuid,p_role text,p_reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $f$
DECLARE v_actor uuid;v_reason text;
BEGIN
 v_actor:=(SELECT auth.uid());
 IF v_actor IS NULL OR public.current_app_role() IS DISTINCT FROM 'ADMIN' THEN
  RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501'; END IF;
 v_reason:=btrim(p_reason);
 IF p_user_id IS NULL OR p_role IS NULL OR p_role NOT IN ('ADMIN','SECURITY') OR v_reason IS NULL
 OR length(v_reason) NOT BETWEEN 10 AND 500 OR v_reason ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Datos invalidos' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(706,2026);
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
  RAISE EXCEPTION 'Identidad Auth inexistente' USING ERRCODE='P0002'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_user_id) THEN
  RAISE EXCEPTION 'El usuario ya tiene perfil; usa gestion de acceso' USING ERRCODE='23505'; END IF;
 INSERT INTO public.profiles(user_id,role,is_active)
 VALUES(p_user_id,p_role::public.app_role,false);
 INSERT INTO public.admin_audit_log(actor_user_id,target_user_id,event_type,reason,previous_state,new_state)
 VALUES(v_actor,p_user_id,'USER_INVITED',v_reason,NULL,
  jsonb_build_object('role',p_role,'is_active',false));
 RETURN true;
END; $f$;

CREATE FUNCTION public.dactivos_list_audit_events(p_limit integer DEFAULT 100,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $f$
DECLARE v_role text;
BEGIN
 v_role:=public.current_app_role();
 IF (SELECT auth.uid()) IS NULL OR coalesce(v_role,'') NOT IN('ADMIN','SECURITY') THEN
  RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000 THEN
  RAISE EXCEPTION 'Paginacion invalida' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(ev) ORDER BY ev.created_at DESC,ev.id DESC)
 FROM (SELECT * FROM (
  SELECT 'op:'||l.id::text AS id,l.created_at,'OPERATIVO'::text AS source,
   l.operation AS operation,l.entity_table AS entity,l.entity_key AS reference,
   l.actor_user_id::text AS actor,NULL::text AS reason
  FROM public.operational_audit_log l WHERE v_role='ADMIN'
  UNION ALL
  SELECT 'as:'||l.id::text,l.created_at,'ASIGNACION',l.operation,'asset_assignments',l.assignment_id::text,l.actor_user_id::text,NULL::text
  FROM public.assignment_audit_log l
  JOIN public.asset_assignments aa ON aa.id=l.assignment_id
  JOIN public.assets a ON a.id=aa.asset_id
  WHERE v_role='ADMIN' OR a.status<>'RETIRED'::public.asset_status
  UNION ALL
  SELECT 'mc:'||l.id::text,l.created_at,'MANTENIMIENTO',l.operation,'asset_maintenance_cases',l.case_id::text,l.actor_user_id::text,NULL::text
  FROM public.maintenance_audit_log l
  JOIN public.asset_maintenance_cases mc ON mc.id=l.case_id
  JOIN public.assets a ON a.id=mc.asset_id
  WHERE v_role='ADMIN' OR a.status<>'RETIRED'::public.asset_status
  UNION ALL
  SELECT 'ad:'||l.id::text,l.created_at,'ADMINISTRACION',l.event_type,'profiles',l.target_user_id::text,l.actor_user_id::text,l.reason
  FROM public.admin_audit_log l WHERE v_role='ADMIN'
  UNION ALL
  SELECT 'lc:'||l.id::text,l.created_at,'CICLO_VIDA',
   (CASE WHEN l.new_status='RETIRED' THEN 'BAJA' ELSE 'REACTIVACION' END),
   'assets',l.asset_id::text,l.actor_user_id::text,l.reason
  FROM public.asset_lifecycle_log l WHERE v_role='ADMIN'
 ) all_events ORDER BY created_at DESC,id DESC LIMIT p_limit OFFSET p_offset) ev
 ),'[]'::jsonb);
END; $f$;

CREATE FUNCTION public.dactivos_admin_report_page(p_kind text,p_limit integer DEFAULT 250,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $f$
DECLARE result jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR public.current_app_role() IS DISTINCT FROM 'ADMIN' THEN
  RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN('assets','employees','assignments','maintenance')
 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 250
 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10250 THEN
  RAISE EXCEPTION 'Parametros invalidos' USING ERRCODE='22023'; END IF;
 IF p_kind='assets' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO result
  FROM (SELECT internal_code,serial_number,name,category_code,status::text AS status,created_at
        FROM public.assets ORDER BY internal_code,id LIMIT p_limit OFFSET p_offset) q;
 ELSIF p_kind='employees' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO result
  FROM (SELECT e.employee_code,e.full_name,d.code AS department_code,e.is_active,e.created_at
        FROM public.employees e JOIN public.departments d ON d.id=e.department_id
        ORDER BY e.employee_code,e.id LIMIT p_limit OFFSET p_offset) q;
 ELSIF p_kind='assignments' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO result
  FROM (SELECT a.internal_code,e.employee_code,aa.category_code,aa.assigned_at,aa.returned_at,ri.condition AS return_condition
        FROM public.asset_assignments aa JOIN public.assets a ON a.id=aa.asset_id
        JOIN public.employees e ON e.id=aa.employee_id
        LEFT JOIN public.asset_return_inspections ri ON ri.assignment_id=aa.id
        ORDER BY aa.assigned_at,aa.id LIMIT p_limit OFFSET p_offset) q;
 ELSE
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO result
  FROM (SELECT a.internal_code,mc.status,mc.opened_at,mc.resolved_at,mc.description,mc.resolution_notes
        FROM public.asset_maintenance_cases mc JOIN public.assets a ON a.id=mc.asset_id
        ORDER BY mc.opened_at,mc.id LIMIT p_limit OFFSET p_offset) q;
 END IF;
 RETURN result;
END; $f$;

-- SECURITY DEFINER: todos quedan sin PUBLIC/anon y concedidos solo a authenticated.
REVOKE ALL ON FUNCTION public.dactivos_guard_lifecycle_log() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_change_asset_lifecycle(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_link_invited_user(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_audit_events(integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_report_page(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_change_asset_lifecycle(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_link_invited_user(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_audit_events(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_report_page(text,integer,integer) TO authenticated;
COMMIT;
SELECT pg_catalog.pg_notify('pgrst','reload schema');
