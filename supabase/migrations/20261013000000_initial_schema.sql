-- DACTIVOS initial schema from exported catalog (2026-10-13).
-- CLEAN PROJECT ONLY. NEVER execute on dactivos-demo or an existing populated database.
-- No auth.users rows, user profiles, or operational/fictitious data are copied.
BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE public."app_role" AS ENUM ('ADMIN', 'SECURITY');
CREATE TYPE public."asset_status" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED');

CREATE TABLE public."admin_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "event_type" text NOT NULL,
  "target_user_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "previous_state" jsonb,
  "new_state" jsonb NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."admin_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "category_code" text NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "returned_at" timestamp with time zone,
  "assigned_by" uuid NOT NULL,
  "returned_by" uuid,
  "assignment_notes" text,
  "return_notes" text
);
ALTER TABLE public."asset_assignments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_categories" (
  "code" text NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."asset_categories" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_lifecycle_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "asset_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "previous_status" public."asset_status" NOT NULL,
  "new_status" public."asset_status" NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."asset_lifecycle_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_maintenance_cases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "source_inspection_id" uuid,
  "status" text DEFAULT 'OPEN'::text NOT NULL,
  "description" text NOT NULL,
  "opened_by" uuid NOT NULL,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "resolution_notes" text
);
ALTER TABLE public."asset_maintenance_cases" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_release_consumptions" (
  "validation_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "consumed_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
ALTER TABLE public."asset_release_consumptions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_release_validations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "source_case_id" uuid NOT NULL,
  "physically_verified" boolean NOT NULL,
  "validation_notes" text NOT NULL,
  "validated_by" uuid NOT NULL,
  "validated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."asset_release_validations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."asset_return_inspections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "assignment_id" uuid NOT NULL,
  "condition" text NOT NULL,
  "notes" text,
  "inspected_by" uuid NOT NULL,
  "inspected_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."asset_return_inspections" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."assets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "internal_code" text NOT NULL,
  "serial_number" text NOT NULL,
  "category_code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" public."asset_status" DEFAULT 'AVAILABLE'::public."asset_status" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."assets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."assignment_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "assignment_id" uuid NOT NULL,
  "operation" text NOT NULL,
  "actor_user_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."assignment_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."departments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."departments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."employees" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_code" text NOT NULL,
  "full_name" text NOT NULL,
  "department_id" uuid NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."employees" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."maintenance_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "case_id" uuid NOT NULL,
  "operation" text NOT NULL,
  "actor_user_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."maintenance_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."operational_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "entity_table" text NOT NULL,
  "entity_key" text NOT NULL,
  "operation" text NOT NULL,
  "actor_user_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."operational_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."profiles" (
  "user_id" uuid NOT NULL,
  "role" public."app_role",
  "is_active" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
ALTER TABLE public."admin_audit_log" ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_audit_log" ADD CONSTRAINT "admin_audit_log_reason_check" CHECK (length(btrim(reason)) >= 10);
ALTER TABLE public."admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id);
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_category_code_fkey" FOREIGN KEY (category_code) REFERENCES asset_categories(code) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "asset_assignments_returned_by_fkey" FOREIGN KEY (returned_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "assignments_dates_valid" CHECK (returned_at IS NULL OR returned_at >= assigned_at);
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "assignments_notes_valid" CHECK ((assignment_notes IS NULL OR length(assignment_notes) <= 2000) AND (return_notes IS NULL OR length(return_notes) <= 2000));
ALTER TABLE public."asset_assignments" ADD CONSTRAINT "assignments_return_consistent" CHECK (returned_at IS NULL AND returned_by IS NULL OR returned_at IS NOT NULL AND returned_by IS NOT NULL);
ALTER TABLE public."asset_categories" ADD CONSTRAINT "asset_categories_allowed_codes" CHECK (code = ANY (ARRAY['HANDHELD'::text, 'COMPUTER'::text]));
ALTER TABLE public."asset_categories" ADD CONSTRAINT "asset_categories_code_format" CHECK (code ~ '^[A-Z][A-Z0-9_]{1,29}$'::text);
ALTER TABLE public."asset_categories" ADD CONSTRAINT "asset_categories_name_key" UNIQUE (name);
ALTER TABLE public."asset_categories" ADD CONSTRAINT "asset_categories_name_valid" CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 80 AND name = btrim(name));
ALTER TABLE public."asset_categories" ADD CONSTRAINT "asset_categories_pkey" PRIMARY KEY (code);
ALTER TABLE public."asset_lifecycle_log" ADD CONSTRAINT "asset_lifecycle_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_lifecycle_log" ADD CONSTRAINT "asset_lifecycle_log_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_lifecycle_log" ADD CONSTRAINT "asset_lifecycle_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."asset_lifecycle_log" ADD CONSTRAINT "asset_lifecycle_log_reason_check" CHECK (length(btrim(reason)) >= 10 AND length(btrim(reason)) <= 500 AND reason !~ '[[:cntrl:]]'::text);
ALTER TABLE public."asset_lifecycle_log" ADD CONSTRAINT "lifecycle_status_pairs" CHECK (previous_status = 'AVAILABLE'::asset_status AND new_status = 'RETIRED'::asset_status OR previous_status = 'RETIRED'::asset_status AND new_status = 'AVAILABLE'::asset_status);
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_description_check" CHECK (length(btrim(description)) >= 10 AND length(btrim(description)) <= 2000);
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_opened_by_fkey" FOREIGN KEY (opened_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_pkey" PRIMARY KEY (id);
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_source_inspection_id_fkey" FOREIGN KEY (source_inspection_id) REFERENCES asset_return_inspections(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_source_inspection_id_key" UNIQUE (source_inspection_id);
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "asset_maintenance_cases_status_check" CHECK (status = ANY (ARRAY['OPEN'::text, 'RESOLVED'::text]));
ALTER TABLE public."asset_maintenance_cases" ADD CONSTRAINT "maintenance_resolution_consistent" CHECK (status = 'OPEN'::text AND resolved_by IS NULL AND resolved_at IS NULL AND resolution_notes IS NULL OR status = 'RESOLVED'::text AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(btrim(COALESCE(resolution_notes, ''::text))) >= 10);
ALTER TABLE public."asset_release_consumptions" ADD CONSTRAINT "asset_release_consumptions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_release_consumptions" ADD CONSTRAINT "asset_release_consumptions_pkey" PRIMARY KEY (validation_id);
ALTER TABLE public."asset_release_consumptions" ADD CONSTRAINT "asset_release_consumptions_validation_id_fkey" FOREIGN KEY (validation_id) REFERENCES asset_release_validations(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_physically_verified_check" CHECK (physically_verified = true);
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_pkey" PRIMARY KEY (id);
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_source_case_id_fkey" FOREIGN KEY (source_case_id) REFERENCES asset_maintenance_cases(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_source_case_id_key" UNIQUE (source_case_id);
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_validated_by_fkey" FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_release_validations" ADD CONSTRAINT "asset_release_validations_validation_notes_check" CHECK (length(btrim(validation_notes)) >= 10 AND length(btrim(validation_notes)) <= 2000 AND validation_notes !~ '[[:cntrl:]]'::text);
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "asset_return_inspections_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES asset_assignments(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "asset_return_inspections_assignment_id_key" UNIQUE (assignment_id);
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "asset_return_inspections_condition_check" CHECK (condition = ANY (ARRAY['GOOD'::text, 'DAMAGED'::text]));
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "asset_return_inspections_inspected_by_fkey" FOREIGN KEY (inspected_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "asset_return_inspections_pkey" PRIMARY KEY (id);
ALTER TABLE public."asset_return_inspections" ADD CONSTRAINT "return_inspection_notes_valid" CHECK ((notes IS NULL OR length(notes) <= 2000) AND (condition = 'GOOD'::text OR length(btrim(COALESCE(notes, ''::text))) >= 10));
ALTER TABLE public."assets" ADD CONSTRAINT "assets_category_code_fkey" FOREIGN KEY (category_code) REFERENCES asset_categories(code) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."assets" ADD CONSTRAINT "assets_description_valid" CHECK (description IS NULL OR length(description) <= 2000);
ALTER TABLE public."assets" ADD CONSTRAINT "assets_internal_code_valid" CHECK (length(internal_code) >= 2 AND length(internal_code) <= 60 AND internal_code = btrim(internal_code) AND internal_code !~ '[[:space:]]'::text);
ALTER TABLE public."assets" ADD CONSTRAINT "assets_name_valid" CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 150 AND name = btrim(name));
ALTER TABLE public."assets" ADD CONSTRAINT "assets_pkey" PRIMARY KEY (id);
ALTER TABLE public."assets" ADD CONSTRAINT "assets_serial_valid" CHECK (length(serial_number) >= 2 AND length(serial_number) <= 120 AND serial_number = btrim(serial_number) AND serial_number !~ '[[:cntrl:]]'::text);
ALTER TABLE public."assignment_audit_log" ADD CONSTRAINT "assignment_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."assignment_audit_log" ADD CONSTRAINT "assignment_audit_log_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES asset_assignments(id) ON DELETE RESTRICT;
ALTER TABLE public."assignment_audit_log" ADD CONSTRAINT "assignment_audit_log_operation_check" CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text]));
ALTER TABLE public."assignment_audit_log" ADD CONSTRAINT "assignment_audit_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."assignment_audit_log" ADD CONSTRAINT "assignment_audit_payload_valid" CHECK (operation = 'INSERT'::text AND old_data IS NULL OR operation = 'UPDATE'::text AND old_data IS NOT NULL);
ALTER TABLE public."departments" ADD CONSTRAINT "departments_code_format" CHECK (code ~ '^[A-Z][A-Z0-9_]{1,29}$'::text);
ALTER TABLE public."departments" ADD CONSTRAINT "departments_code_key" UNIQUE (code);
ALTER TABLE public."departments" ADD CONSTRAINT "departments_name_valid" CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 120 AND name = btrim(name));
ALTER TABLE public."departments" ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);
ALTER TABLE public."employees" ADD CONSTRAINT "employees_code_valid" CHECK (length(employee_code) >= 2 AND length(employee_code) <= 40 AND employee_code = btrim(employee_code) AND employee_code !~ '[[:space:]]'::text);
ALTER TABLE public."employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE public."employees" ADD CONSTRAINT "employees_name_valid" CHECK (length(full_name) >= 2 AND length(full_name) <= 150 AND full_name = btrim(full_name));
ALTER TABLE public."employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY (id);
ALTER TABLE public."maintenance_audit_log" ADD CONSTRAINT "maintenance_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_audit_log" ADD CONSTRAINT "maintenance_audit_log_case_id_fkey" FOREIGN KEY (case_id) REFERENCES asset_maintenance_cases(id) ON DELETE RESTRICT;
ALTER TABLE public."maintenance_audit_log" ADD CONSTRAINT "maintenance_audit_log_operation_check" CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text]));
ALTER TABLE public."maintenance_audit_log" ADD CONSTRAINT "maintenance_audit_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."maintenance_audit_log" ADD CONSTRAINT "maintenance_audit_payload_valid" CHECK (operation = 'INSERT'::text AND old_data IS NULL OR operation = 'UPDATE'::text AND old_data IS NOT NULL);
ALTER TABLE public."operational_audit_log" ADD CONSTRAINT "operational_audit_entity_valid" CHECK (entity_table = ANY (ARRAY['asset_categories'::text, 'departments'::text, 'employees'::text, 'assets'::text]));
ALTER TABLE public."operational_audit_log" ADD CONSTRAINT "operational_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."operational_audit_log" ADD CONSTRAINT "operational_audit_log_operation_check" CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]));
ALTER TABLE public."operational_audit_log" ADD CONSTRAINT "operational_audit_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."operational_audit_log" ADD CONSTRAINT "operational_audit_payload_valid" CHECK (operation = 'INSERT'::text AND old_data IS NULL AND new_data IS NOT NULL OR operation = 'UPDATE'::text AND old_data IS NOT NULL AND new_data IS NOT NULL OR operation = 'DELETE'::text AND old_data IS NOT NULL AND new_data IS NULL);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_active_requires_role" CHECK (is_active = false OR role IS NOT NULL);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX assignments_asset_history_idx ON public.asset_assignments USING btree (asset_id, assigned_at DESC);
CREATE INDEX assignments_employee_history_idx ON public.asset_assignments USING btree (employee_id, assigned_at DESC);
CREATE UNIQUE INDEX assignments_one_open_category_per_employee ON public.asset_assignments USING btree (employee_id, category_code) WHERE (returned_at IS NULL);
CREATE UNIQUE INDEX assignments_one_open_per_asset ON public.asset_assignments USING btree (asset_id) WHERE (returned_at IS NULL);
CREATE INDEX maintenance_cases_asset_idx ON public.asset_maintenance_cases USING btree (asset_id, opened_at DESC);
CREATE INDEX maintenance_cases_open_idx ON public.asset_maintenance_cases USING btree (asset_id) WHERE (status = 'OPEN'::text);
CREATE INDEX release_consumptions_asset_idx ON public.asset_release_consumptions USING btree (asset_id);
CREATE INDEX asset_release_validations_asset_idx ON public.asset_release_validations USING btree (asset_id, validated_at DESC);
CREATE INDEX return_inspections_date_idx ON public.asset_return_inspections USING btree (inspected_at DESC);
CREATE INDEX assets_category_idx ON public.assets USING btree (category_code);
CREATE UNIQUE INDEX assets_internal_code_unique ON public.assets USING btree (upper(internal_code));
CREATE UNIQUE INDEX assets_serial_number_unique ON public.assets USING btree (upper(serial_number));
CREATE INDEX assets_status_idx ON public.assets USING btree (status);
CREATE INDEX assignment_audit_history_idx ON public.assignment_audit_log USING btree (assignment_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX departments_name_normalized_unique ON public.departments USING btree (lower(name));
CREATE UNIQUE INDEX employees_code_unique ON public.employees USING btree (upper(employee_code));
CREATE INDEX employees_department_idx ON public.employees USING btree (department_id);
CREATE INDEX maintenance_audit_case_idx ON public.maintenance_audit_log USING btree (case_id, created_at DESC, id DESC);
CREATE INDEX operational_audit_date_idx ON public.operational_audit_log USING btree (created_at DESC);
CREATE INDEX operational_audit_entity_idx ON public.operational_audit_log USING btree (entity_table, entity_key, created_at DESC);

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
  LIMIT 1;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_admin_change_asset_lifecycle(p_asset_id uuid, p_reactivate boolean, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END; $function$;
CREATE OR REPLACE FUNCTION public.dactivos_admin_link_invited_user(p_user_id uuid, p_role text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END; $function$;
CREATE OR REPLACE FUNCTION public.dactivos_admin_list_users()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR public.current_app_role()
        IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      to_jsonb(visible_user)
      ORDER BY visible_user.created_at DESC,
               visible_user.id DESC
    )
    FROM (
      SELECT
        u.id,
        u.email,
        p.role::text AS role,
        p.is_active,
        (u.email_confirmed_at IS NOT NULL)
          AS email_confirmed,
        u.created_at,
        u.last_sign_in_at
      FROM auth.users AS u
      LEFT JOIN public.profiles AS p
        ON p.user_id = u.id
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT 500
    ) AS visible_user
  ), '[]'::jsonb);
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_admin_report_page(p_kind text, p_limit integer DEFAULT 250, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END; $function$;
CREATE OR REPLACE FUNCTION public.dactivos_admin_set_user_access(p_user_id uuid, p_role text, p_is_active boolean, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_old_role text;
  v_old_active boolean;
  v_reason text;
  v_admin_count bigint;
BEGIN
  v_actor := (SELECT auth.uid());

  IF v_actor IS NULL
     OR public.current_app_role()
       IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  v_reason := btrim(p_reason);

  IF p_user_id IS NULL
     OR p_role IS NULL
     OR p_role NOT IN ('ADMIN', 'SECURITY')
     OR p_is_active IS NULL
     OR v_reason IS NULL
     OR length(v_reason) NOT BETWEEN 10 AND 500
     OR v_reason ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'Parámetros administrativos inválidos'
      USING ERRCODE = '22023';
  END IF;

  -- Evitar modificaciones sobre la propia cuenta.
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION
      'No se puede modificar la propia cuenta'
      USING ERRCODE = '23514';
  END IF;

  -- Serializar operaciones administrativas
  -- ejecutadas mediante esta RPC.
  PERFORM pg_catalog.pg_advisory_xact_lock(706, 2026);

  SELECT p.role::text, p.is_active
  INTO v_old_role, v_old_active
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inexistente'
      USING ERRCODE = 'P0002';
  END IF;

  -- Una cuenta activada debe tener correo confirmado.
  IF p_is_active AND NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_user_id
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Correo sin confirmar'
      USING ERRCODE = '23514';
  END IF;

  -- No generar escrituras ni auditorías ficticias.
  IF v_old_role IS NOT DISTINCT FROM p_role
     AND v_old_active IS NOT DISTINCT FROM p_is_active
  THEN
    RETURN false;
  END IF;

  -- Proteger al último administrador activo.
  IF v_old_role = 'ADMIN'
     AND v_old_active = true
     AND (
       p_role <> 'ADMIN'
       OR p_is_active = false
     )
  THEN
    SELECT COUNT(*)
    INTO v_admin_count
    FROM public.profiles p
    WHERE p.role = 'ADMIN'::public.app_role
      AND p.is_active = true;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION
        'No se puede desactivar al último ADMIN'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    role = p_role::public.app_role,
    is_active = p_is_active,
    updated_at = statement_timestamp()
  WHERE user_id = p_user_id;

  -- La modificación y auditoría son atómicas.
  INSERT INTO public.admin_audit_log (
    actor_user_id,
    target_user_id,
    event_type,
    reason,
    previous_state,
    new_state
  )
  VALUES (
    v_actor,
    p_user_id,
    'USER_ACCESS_UPDATED',
    v_reason,
    jsonb_build_object(
      'role', v_old_role,
      'is_active', v_old_active
    ),
    jsonb_build_object(
      'role', p_role,
      'is_active', p_is_active
    )
  );

  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_assign_asset(p_asset_id uuid, p_employee_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_role text;
  v_category text;
  v_assignment_id uuid;
  v_notes text;
BEGIN
  v_actor := (SELECT auth.uid());
  v_role := public.current_app_role();

  IF v_actor IS NULL
     OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_asset_id IS NULL OR p_employee_id IS NULL THEN
    RAISE EXCEPTION 'Activo y empleado obligatorios'
      USING ERRCODE = '22023';
  END IF;

  v_notes := NULLIF(btrim(p_notes), '');

  IF v_notes IS NOT NULL
     AND (
       length(v_notes) > 2000
       OR v_notes ~ '[[:cntrl:]]'
     )
  THEN
    RAISE EXCEPTION 'Notas inválidas'
      USING ERRCODE = '22023';
  END IF;

  -- Bloquear el activo durante la entrega.
  SELECT a.category_code
  INTO v_category
  FROM public.assets a
  WHERE a.id = p_asset_id
    AND a.status = 'AVAILABLE'::public.asset_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Activo inexistente o no disponible'
      USING ERRCODE = '23514';
  END IF;

  -- El trigger de asignaciones valida y bloquea
  -- el empleado, y confirma la categoría.
  INSERT INTO public.asset_assignments (
    asset_id,
    employee_id,
    category_code,
    assigned_by,
    assignment_notes
  )
  VALUES (
    p_asset_id,
    p_employee_id,
    v_category,
    v_actor,
    v_notes
  )
  RETURNING id INTO v_assignment_id;

  -- assignments_sync_asset cambia el estado.
  -- assignments_audit registra la entrega.
  -- assets_audit registra el cambio del activo.

  RETURN v_assignment_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_audit_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    IF TG_TABLE_SCHEMA <> 'public'
       OR TG_TABLE_NAME <> 'asset_assignments'
       OR TG_OP NOT IN ('INSERT', 'UPDATE')
    THEN
        RAISE EXCEPTION
            'Origen de auditoría no autorizado';
    END IF;

    INSERT INTO public.assignment_audit_log (
        assignment_id,
        operation,
        actor_user_id,
        old_data,
        new_data
    )
    VALUES (
        NEW.id,
        TG_OP,
        (SELECT auth.uid()),
        CASE
            WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
            ELSE NULL
        END,
        to_jsonb(NEW)
    );

    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_audit_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_key text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public'
     OR TG_TABLE_NAME NOT IN (
       'asset_categories',
       'departments',
       'employees',
       'assets'
     )
     OR TG_OP NOT IN ('INSERT', 'UPDATE', 'DELETE')
  THEN
    RAISE EXCEPTION 'Origen de auditoría no autorizado';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    IF v_old = v_new THEN
      RETURN NEW;
    END IF;

  ELSE
    v_old := to_jsonb(OLD);
  END IF;

  IF TG_TABLE_NAME = 'asset_categories' THEN
    v_key := COALESCE(
      v_new ->> 'code',
      v_old ->> 'code'
    );
  ELSE
    v_key := COALESCE(
      v_new ->> 'id',
      v_old ->> 'id'
    );
  END IF;

  INSERT INTO public.operational_audit_log (
    entity_table,
    entity_key,
    operation,
    actor_user_id,
    old_data,
    new_data
  )
  VALUES (
    TG_TABLE_NAME,
    v_key,
    TG_OP,
    (SELECT auth.uid()),
    v_old,
    v_new
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_audit_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_TABLE_SCHEMA <> 'public'
     OR TG_TABLE_NAME <> 'asset_maintenance_cases'
     OR TG_OP NOT IN ('INSERT', 'UPDATE')
  THEN
    RAISE EXCEPTION
      'Origen de auditoría no autorizado';
  END IF;

  INSERT INTO public.maintenance_audit_log (
    case_id,
    operation,
    actor_user_id,
    old_data,
    new_data
  )
  VALUES (
    NEW.id,
    TG_OP,
    (SELECT auth.uid()),
    CASE
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
      ELSE NULL
    END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_check_asset_assignment_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_asset_id uuid;
  v_status public.asset_status;
  v_open_count bigint;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' THEN
    RAISE EXCEPTION
      'Esquema de trigger no autorizado';
  END IF;

  IF TG_TABLE_NAME = 'assets' THEN
    v_asset_id := NEW.id;

  ELSIF TG_TABLE_NAME = 'asset_assignments' THEN
    IF TG_OP = 'DELETE' THEN
      v_asset_id := OLD.asset_id;
    ELSE
      v_asset_id := NEW.asset_id;
    END IF;

  ELSE
    RAISE EXCEPTION
      'Tabla de trigger no autorizada';
  END IF;

  -- Consultar el estado FINAL, no el registro
  -- intermedio del evento que disparo el trigger.
  SELECT a.status
  INTO v_status
  FROM public.assets a
  WHERE a.id = v_asset_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*)
  INTO v_open_count
  FROM public.asset_assignments aa
  WHERE aa.asset_id = v_asset_id
    AND aa.returned_at IS NULL;

  IF v_status = 'ASSIGNED'::public.asset_status
     AND v_open_count <> 1
  THEN
    RAISE EXCEPTION
      'Activo ASSIGNED requiere exactamente una asignacion abierta'
      USING ERRCODE = '23514';
  END IF;

  IF v_status <> 'ASSIGNED'::public.asset_status
     AND v_open_count <> 0
  THEN
    RAISE EXCEPTION
      'Activo no asignado conserva una asignacion abierta'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_consume_asset_release()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_validation_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE'
     OR TG_TABLE_SCHEMA <> 'public'
     OR TG_TABLE_NAME <> 'assets'
  THEN
    RAISE EXCEPTION
      'Origen de consumo no autorizado';
  END IF;

  IF OLD.status =
       'MAINTENANCE'::public.asset_status
     AND NEW.status =
       'AVAILABLE'::public.asset_status
  THEN

    SELECT rv.id
    INTO v_validation_id
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
      );

    IF v_validation_id IS NULL THEN
      RAISE EXCEPTION
        'No existe una validacion disponible'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.asset_release_consumptions (
      validation_id,
      asset_id
    )
    VALUES (
      v_validation_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_create_asset(p_internal_code text, p_serial_number text, p_category_code text, p_name text, p_description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_internal_code text;
    v_serial_number text;
    v_category_code text;
    v_name text;
    v_description text;
    v_asset_id uuid;
BEGIN
    -- Validación del usuario en PostgreSQL
    v_role := public.current_app_role();

    IF (SELECT auth.uid()) IS NULL
       OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    -- Normalización
    v_internal_code := upper(btrim(p_internal_code));
    v_serial_number := btrim(p_serial_number);
    v_category_code := upper(btrim(p_category_code));
    v_name := btrim(p_name);
    v_description := NULLIF(btrim(p_description), '');

    -- Código interno
    IF v_internal_code IS NULL
       OR length(v_internal_code) NOT BETWEEN 2 AND 60
       OR v_internal_code ~ '[[:space:]]'
       OR v_internal_code ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Código interno inválido'
            USING ERRCODE = '22023';
    END IF;

    -- Número de serie
    IF v_serial_number IS NULL
       OR length(v_serial_number) NOT BETWEEN 2 AND 120
       OR v_serial_number ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Número de serie inválido'
            USING ERRCODE = '22023';
    END IF;

    -- Categoría
    IF v_category_code IS NULL
       OR v_category_code NOT IN ('HANDHELD', 'COMPUTER')
    THEN
        RAISE EXCEPTION 'Categoría inválida'
            USING ERRCODE = '22023';
    END IF;

    -- Nombre
    IF v_name IS NULL
       OR length(v_name) NOT BETWEEN 2 AND 150
       OR v_name ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Nombre de activo inválido'
            USING ERRCODE = '22023';
    END IF;

    -- Descripción opcional
    IF v_description IS NOT NULL
       AND length(v_description) > 2000
    THEN
        RAISE EXCEPTION 'Descripción demasiado larga'
            USING ERRCODE = '22023';
    END IF;

    -- Siempre disponible al ingresar al inventario.
    -- El trigger assets_category_active verifica
    -- que la categoría exista y esté activa.
    INSERT INTO public.assets (
        internal_code,
        serial_number,
        category_code,
        name,
        description,
        status
    )
    VALUES (
        v_internal_code,
        v_serial_number,
        v_category_code,
        v_name,
        v_description,
        'AVAILABLE'::public.asset_status
    )
    RETURNING id INTO v_asset_id;

    -- assets_audit registra la inserción con
    -- actor_user_id = auth.uid().
    RETURN v_asset_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_create_department(p_code text, p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_code text;
  v_name text;
  v_department_id uuid;
BEGIN
  -- Identidad y autorización en PostgreSQL
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL
     OR public.current_app_role() IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  -- Normalizar entradas
  v_code := upper(btrim(p_code));
  v_name := btrim(p_name);

  -- Validaciones explícitas
  IF v_code IS NULL
     OR v_code !~ '^[A-Z][A-Z0-9_]{1,29}$'
  THEN
    RAISE EXCEPTION 'Código de departamento inválido'
      USING ERRCODE = '22023';
  END IF;

  IF v_name IS NULL
     OR length(v_name) NOT BETWEEN 2 AND 120
     OR v_name <> btrim(v_name)
     OR v_name ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'Nombre de departamento inválido'
      USING ERRCODE = '22023';
  END IF;

  -- La restricción UNIQUE de PostgreSQL
  -- protege también contra peticiones concurrentes.
  INSERT INTO public.departments (
    code,
    name,
    is_active
  )
  VALUES (
    v_code,
    v_name,
    true
  )
  RETURNING id INTO v_department_id;

  -- El trigger departments_audit registra
  -- automáticamente el INSERT y el actor.

  RETURN v_department_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_create_employee(p_employee_code text, p_full_name text, p_department_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_actor uuid;
    v_role text;
    v_code text;
    v_name text;
    v_employee_id uuid;
BEGIN
    -- Identidad y rol del usuario autenticado
    v_actor := (SELECT auth.uid());
    v_role := public.current_app_role();

    IF v_actor IS NULL
       OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    -- Normalización de identificación laboral
    v_code := upper(btrim(p_employee_code));
    v_name := btrim(p_full_name);

    IF v_code IS NULL
       OR length(v_code) NOT BETWEEN 2 AND 40
       OR v_code ~ '[[:space:]]'
       OR v_code ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Identificación laboral inválida'
            USING ERRCODE = '22023';
    END IF;

    -- Validar nombre
    IF v_name IS NULL
       OR length(v_name) NOT BETWEEN 2 AND 150
       OR v_name ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Nombre de empleado inválido'
            USING ERRCODE = '22023';
    END IF;

    -- Departamento obligatorio
    IF p_department_id IS NULL THEN
        RAISE EXCEPTION 'Departamento obligatorio'
            USING ERRCODE = '22023';
    END IF;

    -- Insertar siempre como activo.
    -- El trigger employees_department_active comprueba
    -- que el departamento exista y esté activo.
    -- La restricción UNIQUE protege los duplicados,
    -- incluso bajo solicitudes concurrentes.
    INSERT INTO public.employees (
        employee_code,
        full_name,
        department_id,
        is_active
    )
    VALUES (
        v_code,
        v_name,
        p_department_id,
        true
    )
    RETURNING id INTO v_employee_id;

    -- employees_audit registra el INSERT
    -- con actor_user_id = auth.uid().
    -- Ambas operaciones forman una transacción.
    RETURN v_employee_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_asset_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF NEW.category_code IS DISTINCT FROM OLD.category_code
       AND EXISTS (
           SELECT 1
           FROM public.asset_assignments aa
           WHERE aa.asset_id = OLD.id
             AND aa.returned_at IS NULL
       )
    THEN
        RAISE EXCEPTION
            'No se puede cambiar la categoría de un activo asignado'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;
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
CREATE OR REPLACE FUNCTION public.dactivos_guard_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_category text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'No se permite eliminar asignaciones históricas'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' THEN

        IF NEW.returned_at IS NOT NULL
           OR NEW.returned_by IS NOT NULL
           OR NEW.return_notes IS NOT NULL
        THEN
            RAISE EXCEPTION
                'La asignación debe crearse abierta'
                USING ERRCODE = '23514';
        END IF;

        SELECT a.category_code
        INTO v_category
        FROM public.assets a
        WHERE a.id = NEW.asset_id
        FOR SHARE;

        IF NOT FOUND
           OR v_category IS DISTINCT FROM NEW.category_code
        THEN
            RAISE EXCEPTION
                'La categoría no coincide con el activo'
                USING ERRCODE = '23514';
        END IF;

        PERFORM 1
        FROM public.employees e
        WHERE e.id = NEW.employee_id
          AND e.is_active = true
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'El empleado debe estar activo'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    -- Una asignación cerrada no se modifica.
    IF OLD.returned_at IS NOT NULL THEN
        RAISE EXCEPTION
            'La asignación ya está cerrada'
            USING ERRCODE = '23514';
    END IF;

    -- No modificar los datos originales de la entrega.
    IF (
        to_jsonb(NEW)
            - 'returned_at'
            - 'returned_by'
            - 'return_notes'
    ) IS DISTINCT FROM (
        to_jsonb(OLD)
            - 'returned_at'
            - 'returned_by'
            - 'return_notes'
    ) THEN
        RAISE EXCEPTION
            'No se permite alterar la entrega original'
            USING ERRCODE = '23514';
    END IF;

    -- Únicamente se permite cerrar la asignación.
    IF NEW.returned_at IS NULL
       OR NEW.returned_by IS NULL
    THEN
        RAISE EXCEPTION
            'La devolución requiere fecha y responsable'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_employee_assignments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF OLD.is_active = true
       AND NEW.is_active = false
       AND EXISTS (
           SELECT 1
           FROM public.asset_assignments aa
           WHERE aa.employee_id = OLD.id
             AND aa.returned_at IS NULL
       )
    THEN
        RAISE EXCEPTION
            'El empleado tiene equipos pendientes de devolución'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_lifecycle_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 RAISE EXCEPTION 'El historial de bajas y reactivaciones es inmutable' USING ERRCODE='23514';
END; $function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_maintenance_case()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'No se permite eliminar casos de mantenimiento'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'OPEN'
       OR NEW.resolved_by IS NOT NULL
       OR NEW.resolved_at IS NOT NULL
       OR NEW.resolution_notes IS NOT NULL
    THEN
      RAISE EXCEPTION
        'Los casos deben registrarse abiertos'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status <> 'OPEN' THEN
    RAISE EXCEPTION
      'El caso resuelto es inmutable'
      USING ERRCODE = '23514';
  END IF;

  -- Solo se pueden modificar los campos de resolución.
  IF (
    to_jsonb(NEW)
      - 'status'
      - 'resolved_by'
      - 'resolved_at'
      - 'resolution_notes'
  ) IS DISTINCT FROM (
    to_jsonb(OLD)
      - 'status'
      - 'resolved_by'
      - 'resolved_at'
      - 'resolution_notes'
  ) THEN
    RAISE EXCEPTION
      'No se puede alterar el origen del caso'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status <> 'RESOLVED'
     OR NEW.resolved_by IS NULL
     OR NEW.resolved_at IS NULL
     OR length(btrim(coalesce(NEW.resolution_notes, ''))) < 10
  THEN
    RAISE EXCEPTION
      'Resolución incompleta'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_release_consumption()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION
      'El consumo de validaciones es inmutable'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.asset_release_validations rv
    WHERE rv.id = NEW.validation_id
      AND rv.asset_id = NEW.asset_id
  ) THEN
    RAISE EXCEPTION
      'Validacion y activo no coinciden'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_guard_release_validation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION
      'Las validaciones fisicas son inmutables'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.asset_maintenance_cases mc
    WHERE mc.id = NEW.source_case_id
      AND mc.asset_id = NEW.asset_id
      AND mc.status = 'RESOLVED'
  ) THEN
    RAISE EXCEPTION
      'La validacion requiere un caso resuelto del mismo activo'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_asset_categories()
 RETURNS TABLE(code text, name text, is_active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_app_role();

  IF COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY') THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.code,
    c.name,
    c.is_active
  FROM public.asset_categories AS c
  WHERE v_role = 'ADMIN'
     OR c.is_active = true
  ORDER BY c.name;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_assets()
 RETURNS TABLE(id uuid, internal_code text, serial_number text, category_code text, category_name text, name text, description text, status asset_status, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_role text;
BEGIN
    v_role := public.current_app_role();

    IF (SELECT auth.uid()) IS NULL
       OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.internal_code,
        a.serial_number,
        a.category_code,
        c.name,
        a.name,
        a.description,
        a.status,
        a.created_at,
        a.updated_at
    FROM public.assets AS a
    INNER JOIN public.asset_categories AS c
        ON c.code = a.category_code
    WHERE
        v_role = 'ADMIN'
        OR (
            v_role = 'SECURITY'
            AND a.status <> 'RETIRED'::public.asset_status
        )
    ORDER BY a.name, a.internal_code;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_assignments()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_role text;
BEGIN
 v_role := public.current_app_role();
 IF (SELECT auth.uid()) IS NULL OR coalesce(v_role,'') NOT IN ('ADMIN','SECURITY') THEN
   RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501';
 END IF;
 RETURN coalesce((
   SELECT jsonb_agg(to_jsonb(aa_view) ORDER BY aa_view.assigned_at DESC, aa_view.id DESC)
   FROM (
     SELECT aa.id, aa.asset_id, a.name AS asset_name, a.internal_code,
       aa.category_code, aa.employee_id, e.full_name, e.employee_code,
       aa.assigned_at, aa.returned_at, aa.assigned_by, aa.returned_by,
       aa.assignment_notes, aa.return_notes,
       ri.condition AS return_condition
     FROM public.asset_assignments aa
     INNER JOIN public.assets a ON a.id=aa.asset_id
     INNER JOIN public.employees e ON e.id=aa.employee_id
     LEFT JOIN public.asset_return_inspections ri ON ri.assignment_id=aa.id
     WHERE v_role='ADMIN' OR a.status <> 'RETIRED'::public.asset_status
     ORDER BY aa.assigned_at DESC, aa.id DESC
     LIMIT 500
   ) aa_view
 ),'[]'::jsonb);
END;
$function$;
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
 ) all_events ORDER BY created_at DESC,id DESC LIMIT p_limit OFFSET p_offset) ev
 ),'[]'::jsonb);
END; $function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_departments()
 RETURNS TABLE(id uuid, code text, name text, is_active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_app_role();

  IF COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY') THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.code,
    d.name,
    d.is_active
  FROM public.departments AS d
  WHERE v_role = 'ADMIN'
     OR d.is_active = true
  ORDER BY d.name;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_employees()
 RETURNS TABLE(id uuid, employee_code text, full_name text, department_id uuid, department_code text, department_name text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_role text;
BEGIN
    v_role := public.current_app_role();

    IF (SELECT auth.uid()) IS NULL
       OR v_role IS NULL
       OR v_role NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.employee_code,
        e.full_name,
        e.department_id,
        d.code,
        d.name,
        e.is_active,
        e.created_at,
        e.updated_at
    FROM public.employees AS e
    INNER JOIN public.departments AS d
        ON d.id = e.department_id
    WHERE
        v_role = 'ADMIN'
        OR (
            v_role = 'SECURITY'
            AND e.is_active = true
            AND d.is_active = true
        )
    ORDER BY e.full_name, e.employee_code;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_list_maintenance_cases()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_role text;
BEGIN
 v_role := public.current_app_role();
 IF (SELECT auth.uid()) IS NULL OR coalesce(v_role,'') NOT IN ('ADMIN','SECURITY') THEN
   RAISE EXCEPTION 'Acceso no autorizado' USING ERRCODE='42501';
 END IF;
 RETURN coalesce((
   SELECT jsonb_agg(to_jsonb(mc_view) ORDER BY mc_view.opened_at DESC, mc_view.id DESC)
   FROM (
     SELECT mc.id, mc.asset_id, a.name AS asset_name, a.internal_code,
        a.status::text AS asset_status, mc.status, mc.description,
        mc.source_inspection_id, mc.opened_at, mc.opened_by,
        mc.resolved_at, mc.resolved_by, mc.resolution_notes
     FROM public.asset_maintenance_cases mc
     INNER JOIN public.assets a ON a.id=mc.asset_id
     WHERE v_role='ADMIN' OR a.status <> 'RETIRED'::public.asset_status
     ORDER BY mc.opened_at DESC, mc.id DESC
     LIMIT 500
   ) mc_view
 ),'[]'::jsonb);
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_open_return_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_asset_id uuid;
BEGIN
  IF TG_OP <> 'INSERT'
     OR TG_TABLE_SCHEMA <> 'public'
     OR TG_TABLE_NAME <> 'asset_return_inspections'
  THEN
    RAISE EXCEPTION 'Origen de mantenimiento inválido';
  END IF;

  IF NEW.condition <> 'DAMAGED' THEN
    RETURN NEW;
  END IF;

  SELECT aa.asset_id
  INTO STRICT v_asset_id
  FROM public.asset_assignments aa
  WHERE aa.id = NEW.assignment_id;

  INSERT INTO public.asset_maintenance_cases (
    asset_id,
    source_inspection_id,
    status,
    description,
    opened_by
  )
  VALUES (
    v_asset_id,
    NEW.id,
    'OPEN',
    NEW.notes,
    NEW.inspected_by
  );

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_release_asset(p_asset_id uuid, p_physically_verified boolean, p_validation_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_role text;
  v_notes text;
  v_last_case_id uuid;
  v_validation_id uuid;
BEGIN
  v_actor := (SELECT auth.uid());
  v_role := public.current_app_role();

  IF v_actor IS NULL
     OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
  THEN
    RAISE EXCEPTION
      'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_asset_id IS NULL
     OR p_physically_verified IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION
      'Debe confirmarse la inspeccion fisica'
      USING ERRCODE = '22023';
  END IF;

  v_notes := btrim(p_validation_notes);

  IF v_notes IS NULL
     OR length(v_notes) NOT BETWEEN 10 AND 2000
     OR v_notes ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION
      'Se requieren notas validas de 10 a 2000 caracteres'
      USING ERRCODE = '22023';
  END IF;

  -- Bloquear el activo para serializar la liberacion.
  PERFORM 1
  FROM public.assets a
  WHERE a.id = p_asset_id
    AND a.status = 'MAINTENANCE'::public.asset_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'El activo no esta en mantenimiento'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.asset_maintenance_cases mc
    WHERE mc.asset_id = p_asset_id
      AND mc.status = 'OPEN'
  ) THEN
    RAISE EXCEPTION
      'Hay casos de mantenimiento abiertos'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.asset_assignments aa
    WHERE aa.asset_id = p_asset_id
      AND aa.returned_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'El activo tiene una asignacion vigente'
      USING ERRCODE = '23514';
  END IF;

  SELECT mc.id
  INTO v_last_case_id
  FROM public.asset_maintenance_cases mc
  WHERE mc.asset_id = p_asset_id
    AND mc.status = 'RESOLVED'
  ORDER BY mc.opened_at DESC, mc.id DESC
  LIMIT 1;

  IF v_last_case_id IS NULL THEN
    RAISE EXCEPTION
      'No existe un caso resuelto'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.asset_release_validations (
    asset_id,
    source_case_id,
    physically_verified,
    validation_notes,
    validated_by
  )
  VALUES (
    p_asset_id,
    v_last_case_id,
    true,
    v_notes,
    v_actor
  )
  RETURNING id INTO v_validation_id;

  UPDATE public.assets
  SET status = 'AVAILABLE'::public.asset_status
  WHERE id = p_asset_id
    AND status = 'MAINTENANCE'::public.asset_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No fue posible liberar el activo'
      USING ERRCODE = '23514';
  END IF;

  RETURN v_validation_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_resolve_maintenance(p_case_id uuid, p_resolution_notes text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_role text;
  v_asset_id uuid;
  v_notes text;
BEGIN
  v_actor := (SELECT auth.uid());
  v_role := public.current_app_role();

  IF v_actor IS NULL
     OR coalesce(v_role, '') NOT IN ('ADMIN', 'SECURITY')
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'Caso obligatorio'
      USING ERRCODE = '22023';
  END IF;

  v_notes := btrim(p_resolution_notes);

  IF v_notes IS NULL
     OR length(v_notes) NOT BETWEEN 10 AND 2000
     OR v_notes ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION
      'La resolución requiere una justificación válida'
      USING ERRCODE = '22023';
  END IF;

  -- Identificar el activo sin bloquear primero el caso.
  SELECT mc.asset_id
  INTO v_asset_id
  FROM public.asset_maintenance_cases mc
  WHERE mc.id = p_case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caso no encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  -- Orden de bloqueo: activo y luego caso.
  PERFORM 1
  FROM public.assets a
  WHERE a.id = v_asset_id
    AND a.status = 'MAINTENANCE'::public.asset_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'El activo no está en mantenimiento'
      USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM public.asset_maintenance_cases mc
  WHERE mc.id = p_case_id
    AND mc.asset_id = v_asset_id
    AND mc.status = 'OPEN'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'El caso ya fue resuelto o cambió de estado'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.asset_maintenance_cases
  SET
    status = 'RESOLVED',
    resolved_by = v_actor,
    resolved_at = statement_timestamp(),
    resolution_notes = v_notes
  WHERE id = p_case_id;

  -- El trigger registra actor, antes y después.
  -- El activo permanece en MAINTENANCE.
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_return_asset(p_assignment_id uuid, p_condition text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_role text;
  v_asset_id uuid;
  v_condition text;
  v_notes text;
  v_new_status public.asset_status;
BEGIN
  v_actor := (SELECT auth.uid());
  v_role := public.current_app_role();

  IF v_actor IS NULL
     OR coalesce(v_role, '') NOT IN ('ADMIN', 'SECURITY')
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Asignación obligatoria'
      USING ERRCODE = '22023';
  END IF;

  v_condition := upper(btrim(p_condition));
  v_notes := nullif(btrim(p_notes), '');

  IF v_condition IS NULL
     OR v_condition NOT IN ('GOOD', 'DAMAGED')
     OR (v_notes IS NOT NULL AND (
       length(v_notes) > 2000
       OR v_notes ~ '[[:cntrl:]]'
     ))
     OR (
       v_condition = 'DAMAGED'
       AND length(coalesce(v_notes, '')) < 10
     )
  THEN
    RAISE EXCEPTION 'Inspección de devolución inválida'
      USING ERRCODE = '22023';
  END IF;

  -- Primero bloquear el activo, siguiendo el
  -- mismo orden de bloqueo que en las entregas.
  SELECT aa.asset_id INTO v_asset_id
  FROM public.asset_assignments aa
  WHERE aa.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asignación no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.assets a
  WHERE a.id = v_asset_id
  FOR UPDATE;

  -- Bloquear la asignación y verificar que siga abierta.
  PERFORM 1
  FROM public.asset_assignments aa
  WHERE aa.id = p_assignment_id
    AND aa.asset_id = v_asset_id
    AND aa.returned_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asignación ya devuelta'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = v_asset_id
      AND a.status = 'ASSIGNED'::public.asset_status
  ) THEN
    RAISE EXCEPTION 'El activo no está asignado'
      USING ERRCODE = '23514';
  END IF;

  -- Registrar la inspección física.
  INSERT INTO public.asset_return_inspections (
    assignment_id, condition, notes, inspected_by
  )
  VALUES (
    p_assignment_id, v_condition, v_notes, v_actor
  );

  -- Cerrar el historial de entrega.
  UPDATE public.asset_assignments
  SET returned_at = statement_timestamp(),
      returned_by = v_actor,
      return_notes = v_notes
  WHERE id = p_assignment_id;

  -- El trigger de estados valida la inspección.
  v_new_status := CASE v_condition
    WHEN 'GOOD' THEN 'AVAILABLE'::public.asset_status
    ELSE 'MAINTENANCE'::public.asset_status
  END;

  UPDATE public.assets
  SET status = v_new_status
  WHERE id = v_asset_id;

  -- El UPDATE de la asignación y el UPDATE del activo
  -- generan sus respectivos eventos de auditoría.
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_set_department_active(p_department_id uuid, p_is_active boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_previous_state boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR public.current_app_role() IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_department_id IS NULL
     OR p_is_active IS NULL
  THEN
    RAISE EXCEPTION 'Parámetros requeridos'
      USING ERRCODE = '22023';
  END IF;

  SELECT d.is_active INTO v_previous_state
  FROM public.departments d
  WHERE d.id = p_department_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departamento no encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_previous_state = p_is_active THEN
    RETURN false;
  END IF;

  IF p_is_active = false AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.department_id = p_department_id
      AND e.is_active = true
  ) THEN
    RAISE EXCEPTION
      'No se puede desactivar un departamento con empleados activos'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.departments
  SET is_active = p_is_active
  WHERE id = p_department_id;

  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_sync_assignment_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION
      'Operación de sincronización no admitida';
  END IF;

  UPDATE public.assets
  SET status = 'ASSIGNED'::public.asset_status
  WHERE id = NEW.asset_id
    AND status = 'AVAILABLE'::public.asset_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'El activo no está disponible para asignación'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_update_asset(p_asset_id uuid, p_name text, p_description text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_name text;
    v_description text;

    v_old_name text;
    v_old_description text;
    v_status public.asset_status;
BEGIN
    -- Autorización en base de datos
    v_role := public.current_app_role();

    IF (SELECT auth.uid()) IS NULL
       OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    IF p_asset_id IS NULL THEN
        RAISE EXCEPTION 'Identificador obligatorio'
            USING ERRCODE = '22023';
    END IF;

    -- Normalización
    v_name := btrim(p_name);
    v_description := NULLIF(btrim(p_description), '');

    IF v_name IS NULL
       OR length(v_name) NOT BETWEEN 2 AND 150
       OR v_name ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Nombre de activo inválido'
            USING ERRCODE = '22023';
    END IF;

    IF v_description IS NOT NULL
       AND (
           length(v_description) > 2000
           OR v_description ~ '[[:cntrl:]]'
       )
    THEN
        RAISE EXCEPTION 'Descripción inválida'
            USING ERRCODE = '22023';
    END IF;

    -- Bloqueo transaccional del activo
    SELECT
        a.name,
        a.description,
        a.status
    INTO
        v_old_name,
        v_old_description,
        v_status
    FROM public.assets a
    WHERE a.id = p_asset_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Activo no encontrado'
            USING ERRCODE = 'P0002';
    END IF;

    -- Edición limitada a activos disponibles
    IF v_status <> 'AVAILABLE'::public.asset_status THEN
        RAISE EXCEPTION
            'No se permite editar un activo en este estado'
            USING ERRCODE = '23514';
    END IF;

    -- No generar cambios ni auditoría innecesarios
    IF v_old_name IS NOT DISTINCT FROM v_name
       AND v_old_description IS NOT DISTINCT FROM v_description
    THEN
        RETURN false;
    END IF;

    UPDATE public.assets
    SET
        name = v_name,
        description = v_description
    WHERE id = p_asset_id;

    -- assets_updated_at actualiza la fecha.
    -- assets_audit registra actor y cambios.
    RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_update_department(p_department_id uuid, p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_name text;
  v_previous_name text;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR public.current_app_role() IS DISTINCT FROM 'ADMIN'
  THEN
    RAISE EXCEPTION 'Acceso no autorizado'
      USING ERRCODE = '42501';
  END IF;

  IF p_department_id IS NULL THEN
    RAISE EXCEPTION 'Identificador requerido'
      USING ERRCODE = '22023';
  END IF;

  v_name := btrim(p_name);

  IF v_name IS NULL
     OR length(v_name) NOT BETWEEN 2 AND 120
     OR v_name ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'Nombre inválido'
      USING ERRCODE = '22023';
  END IF;

  SELECT d.name INTO v_previous_name
  FROM public.departments d
  WHERE d.id = p_department_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departamento no encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  -- Evitar cambios sin contenido real.
  IF v_previous_name = v_name THEN
    RETURN false;
  END IF;

  UPDATE public.departments
  SET name = v_name
  WHERE id = p_department_id;

  -- departments_updated_at y departments_audit
  -- ejecutan automáticamente sus controles.
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_update_employee(p_employee_id uuid, p_full_name text, p_department_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_name text;

    v_old_name text;
    v_old_department uuid;
    v_employee_active boolean;
BEGIN
    -- Identidad y permisos
    v_role := public.current_app_role();

    IF (SELECT auth.uid()) IS NULL
       OR COALESCE(v_role, '') NOT IN ('ADMIN', 'SECURITY')
    THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    -- Parámetros obligatorios
    IF p_employee_id IS NULL
       OR p_department_id IS NULL
    THEN
        RAISE EXCEPTION 'Identificadores obligatorios'
            USING ERRCODE = '22023';
    END IF;

    -- Normalización de nombre
    v_name := btrim(p_full_name);

    IF v_name IS NULL
       OR length(v_name) NOT BETWEEN 2 AND 150
       OR v_name ~ '[[:cntrl:]]'
    THEN
        RAISE EXCEPTION 'Nombre de empleado inválido'
            USING ERRCODE = '22023';
    END IF;

    -- Bloquear fila antes de evaluar y modificar.
    SELECT
        e.full_name,
        e.department_id,
        e.is_active
    INTO
        v_old_name,
        v_old_department,
        v_employee_active
    FROM public.employees e
    WHERE e.id = p_employee_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empleado no encontrado'
            USING ERRCODE = 'P0002';
    END IF;

    -- SECURITY solo puede administrar
    -- empleados que permanezcan activos.
    IF v_role = 'SECURITY'
       AND v_employee_active = false
    THEN
        RAISE EXCEPTION 'Operación no autorizada'
            USING ERRCODE = '42501';
    END IF;

    -- Evitar escrituras y auditoría innecesarias.
    IF v_old_name = v_name
       AND v_old_department = p_department_id
    THEN
        RETURN false;
    END IF;

    -- Validar que el destino esté activo.
    -- FOR SHARE coordina con la desactivación
    -- administrativa del departamento.
    --
    -- La comprobación se aplica también si
    -- únicamente cambia el nombre, cuando
    -- el empleado está activo.
    IF (v_employee_active = true
        OR v_old_department IS DISTINCT FROM p_department_id)
       AND NOT EXISTS (
           SELECT 1
           FROM public.departments d
           WHERE d.id = p_department_id
             AND d.is_active = true
           FOR SHARE
       )
    THEN
        RAISE EXCEPTION
            'El departamento no existe o está inactivo'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.employees
    SET
        full_name = v_name,
        department_id = p_department_id
    WHERE id = p_employee_id;

    -- employees_updated_at actualiza la fecha.
    -- employees_audit registra los cambios.
    -- employees_department_active valida
    -- el traslado cuando corresponde.

    RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_validate_asset_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.asset_categories AS c
    WHERE c.code = NEW.category_code
      AND c.is_active = true
    FOR SHARE
  ) THEN
    RAISE EXCEPTION
      'La categoría no existe o está inactiva'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dactivos_validate_employee_department()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Permitir desactivar un empleado sin trasladarlo.
    -- Esto no concede permisos de escritura al cliente.
    IF TG_OP = 'UPDATE'
       AND NEW.is_active = false
       AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id
    THEN
        RETURN NEW;
    END IF;

    -- Las demás operaciones deben utilizar
    -- un departamento existente y activo.
    --
    -- FOR SHARE coordina esta validación con
    -- la desactivación administrativa del departamento.
    IF NOT EXISTS (
        SELECT 1
        FROM public.departments d
        WHERE d.id = NEW.department_id
          AND d.is_active = true
        FOR SHARE
    ) THEN
        RAISE EXCEPTION
          'El departamento no existe o está inactivo'
          USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE CONSTRAINT TRIGGER assignments_asset_state_consistency AFTER INSERT OR DELETE OR UPDATE ON asset_assignments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dactivos_check_asset_assignment_state();
CREATE TRIGGER assignments_audit AFTER INSERT OR UPDATE ON asset_assignments FOR EACH ROW EXECUTE FUNCTION dactivos_audit_assignment();
CREATE TRIGGER assignments_integrity BEFORE INSERT OR DELETE OR UPDATE ON asset_assignments FOR EACH ROW EXECUTE FUNCTION dactivos_guard_assignment();
CREATE TRIGGER assignments_sync_asset AFTER INSERT ON asset_assignments FOR EACH ROW EXECUTE FUNCTION dactivos_sync_assignment_asset();
CREATE TRIGGER asset_categories_audit AFTER INSERT OR DELETE OR UPDATE ON asset_categories FOR EACH ROW EXECUTE FUNCTION dactivos_audit_change();
CREATE TRIGGER lifecycle_immutable BEFORE DELETE OR UPDATE ON asset_lifecycle_log FOR EACH ROW EXECUTE FUNCTION dactivos_guard_lifecycle_log();
CREATE TRIGGER maintenance_case_audit AFTER INSERT OR UPDATE ON asset_maintenance_cases FOR EACH ROW EXECUTE FUNCTION dactivos_audit_maintenance();
CREATE TRIGGER maintenance_case_integrity BEFORE INSERT OR DELETE OR UPDATE ON asset_maintenance_cases FOR EACH ROW EXECUTE FUNCTION dactivos_guard_maintenance_case();
CREATE TRIGGER release_consumption_integrity BEFORE INSERT OR DELETE OR UPDATE ON asset_release_consumptions FOR EACH ROW EXECUTE FUNCTION dactivos_guard_release_consumption();
CREATE TRIGGER asset_release_integrity BEFORE INSERT OR DELETE OR UPDATE ON asset_release_validations FOR EACH ROW EXECUTE FUNCTION dactivos_guard_release_validation();
CREATE TRIGGER return_inspection_open_maintenance AFTER INSERT ON asset_return_inspections FOR EACH ROW EXECUTE FUNCTION dactivos_open_return_maintenance();
CREATE CONSTRAINT TRIGGER assets_assignment_state_consistency AFTER INSERT OR UPDATE ON assets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dactivos_check_asset_assignment_state();
CREATE TRIGGER assets_audit AFTER INSERT OR DELETE OR UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_audit_change();
CREATE TRIGGER assets_category_active BEFORE INSERT OR UPDATE OF category_code ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_validate_asset_category();
CREATE TRIGGER assets_consume_release AFTER UPDATE OF status ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_consume_asset_release();
CREATE TRIGGER assets_open_assignment_category_guard BEFORE UPDATE OF category_code ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_guard_asset_category();
CREATE TRIGGER assets_status_guard BEFORE UPDATE OF status ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_guard_asset_status();
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION dactivos_set_updated_at();
CREATE TRIGGER departments_audit AFTER INSERT OR DELETE OR UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION dactivos_audit_change();
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION dactivos_set_updated_at();
CREATE TRIGGER employees_audit AFTER INSERT OR DELETE OR UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION dactivos_audit_change();
CREATE TRIGGER employees_department_active BEFORE INSERT OR UPDATE OF department_id, is_active ON employees FOR EACH ROW EXECUTE FUNCTION dactivos_validate_employee_department();
CREATE TRIGGER employees_open_assignments_guard BEFORE UPDATE OF is_active ON employees FOR EACH ROW EXECUTE FUNCTION dactivos_guard_employee_assignments();
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION dactivos_set_updated_at();

INSERT INTO public.asset_categories (code,name,is_active) VALUES ('HANDHELD','Handheld',true),('COMPUTER','Computadora',true);

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_change_asset_lifecycle(uuid,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_change_asset_lifecycle(uuid,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_link_invited_user(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_link_invited_user(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_list_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_list_users() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_report_page(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_report_page(text,integer,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_admin_set_user_access(uuid,text,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_assign_asset(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_assign_asset(uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_audit_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_audit_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_audit_maintenance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_check_asset_assignment_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_consume_asset_release() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_create_asset(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_create_asset(text,text,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_create_department(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_create_department(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_create_employee(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_create_employee(text,text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_asset_category() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_asset_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_employee_assignments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_lifecycle_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_maintenance_case() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_release_consumption() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_guard_release_validation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_asset_categories() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_asset_categories() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_assets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_assets() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_assignments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_assignments() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_audit_events(integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_audit_events(integer,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_departments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_departments() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_employees() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_employees() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_list_maintenance_cases() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_list_maintenance_cases() TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_open_return_maintenance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_release_asset(uuid,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_release_asset(uuid,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_resolve_maintenance(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_resolve_maintenance(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_return_asset(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_return_asset(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_set_department_active(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_set_department_active(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_sync_assignment_asset() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_update_asset(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_update_asset(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_update_department(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_update_department(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_update_employee(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dactivos_update_employee(uuid,text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.dactivos_validate_asset_category() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dactivos_validate_employee_department() FROM PUBLIC, anon, authenticated;
COMMIT;
