-- Execute ONLY in a new project after applying initial migration.
WITH checks AS (
 SELECT 'tables' AS kind, (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name = ANY(ARRAY['admin_audit_log','asset_assignments','asset_categories','asset_lifecycle_log','asset_maintenance_cases','asset_release_consumptions','asset_release_validations','asset_return_inspections','assets','assignment_audit_log','departments','employees','maintenance_audit_log','operational_audit_log','profiles'])) AS total, 15 AS expected
 UNION ALL SELECT 'categories', count(*), 2 FROM public.asset_categories
 UNION ALL SELECT 'functions', count(*), 42 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'dactivos_%' OR p.proname='current_app_role')
 UNION ALL SELECT 'triggers', count(*), 24 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL SELECT 'rls_enabled', count(*), 15 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname = ANY(ARRAY['admin_audit_log','asset_assignments','asset_categories','asset_lifecycle_log','asset_maintenance_cases','asset_release_consumptions','asset_release_validations','asset_return_inspections','assets','assignment_audit_log','departments','employees','maintenance_audit_log','operational_audit_log','profiles']) AND c.relrowsecurity
)
SELECT kind,total,expected,CASE WHEN total=expected THEN 'PASS' ELSE 'REVISAR' END AS status FROM checks ORDER BY kind;
