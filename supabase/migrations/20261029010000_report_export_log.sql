-- Auditoría de exportaciones CSV (FR-10, R11, D13): quién exportó qué reporte, con qué rango de
-- fechas y cuántas filas. Las exportaciones contienen el directorio de empleados, así que cada una
-- deja registro. El registro es inmutable y aparece en el historial de ADMIN con el origen REPORTE.
BEGIN;

CREATE TABLE public.report_export_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid NOT NULL REFERENCES auth.users (id),
  report_kind text NOT NULL
    CHECK (report_kind IN ('assets', 'employees', 'assignments', 'maintenance')),
  date_from date,
  date_to date,
  row_count integer NOT NULL CHECK (row_count BETWEEN 0 AND 10000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_export_range_valid CHECK (date_from IS NULL OR date_to IS NULL OR date_from <= date_to)
);
ALTER TABLE public.report_export_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.report_export_log FROM PUBLIC, anon, authenticated;
CREATE INDEX report_export_log_date_idx ON public.report_export_log (created_at DESC);

CREATE FUNCTION public.dactivos_guard_report_export_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION 'El registro de exportaciones es inmutable' USING ERRCODE = '23514';
END;
$function$;
REVOKE ALL ON FUNCTION public.dactivos_guard_report_export_log() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER report_export_log_immutable
  BEFORE UPDATE OR DELETE ON public.report_export_log
  FOR EACH ROW EXECUTE FUNCTION public.dactivos_guard_report_export_log();

-- La llama la ruta de exportación antes de entregar el archivo; sin este registro no hay archivo.
CREATE FUNCTION public.dactivos_admin_log_report_export(
  p_kind text,
  p_date_from date,
  p_date_to date,
  p_row_count integer
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL OR public.current_app_role() IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('assets', 'employees', 'assignments', 'maintenance')
     OR p_row_count IS NULL OR p_row_count NOT BETWEEN 0 AND 10000
     OR (p_date_from IS NOT NULL AND p_date_to IS NOT NULL AND p_date_from > p_date_to)
  THEN
    RAISE EXCEPTION 'Datos de exportacion invalidos' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.report_export_log (actor_user_id, report_kind, date_from, date_to, row_count)
  VALUES (v_actor, p_kind, p_date_from, p_date_to, p_row_count);
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.dactivos_admin_log_report_export(text, date, date, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_log_report_export(text, date, date, integer)
  TO authenticated;

-- El historial agrega las exportaciones para ADMIN (origen REPORTE); lo demás no cambia.
CREATE OR REPLACE FUNCTION public.dactivos_list_audit_events(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  UNION ALL
  SELECT 're:'||l.id::text,l.created_at,'REPORTE','EXPORTACION',l.report_kind,
   l.row_count::text||' filas'||
   coalesce(' · desde '||l.date_from::text,'')||coalesce(' · hasta '||l.date_to::text,''),
   l.actor_user_id::text,NULL::text
  FROM public.report_export_log l WHERE v_role='ADMIN'
 ) all_events ORDER BY created_at DESC,id DESC LIMIT p_limit OFFSET p_offset) ev
 ),'[]'::jsonb);
END; $function$;
REVOKE ALL ON FUNCTION public.dactivos_list_audit_events(integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_audit_events(integer,integer) TO authenticated;

COMMIT;
