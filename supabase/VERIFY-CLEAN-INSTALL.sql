-- Execute ONLY on a new database after applying the migrations (npm run db:up does it locally).
WITH checks AS (
 SELECT 'tables' AS kind, (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name = ANY(ARRAY['admin_audit_log','asset_assignments','asset_categories','asset_lifecycle_log','asset_maintenance_cases','asset_release_consumptions','asset_release_validations','asset_return_inspections','assets','assignment_audit_log','departments','employees','maintenance_audit_log','operational_audit_log','profiles','report_export_log'])) AS total, 16 AS expected
 UNION ALL SELECT 'categories', count(*), 2 FROM public.asset_categories
 UNION ALL SELECT 'functions', count(*), 45 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'dactivos_%' OR p.proname='current_app_role')
 UNION ALL SELECT 'triggers', count(*), 25 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL SELECT 'rls_enabled', count(*), 16 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname = ANY(ARRAY['admin_audit_log','asset_assignments','asset_categories','asset_lifecycle_log','asset_maintenance_cases','asset_release_consumptions','asset_release_validations','asset_return_inspections','assets','assignment_audit_log','departments','employees','maintenance_audit_log','operational_audit_log','profiles','report_export_log']) AND c.relrowsecurity
)
SELECT kind,total,expected,CASE WHEN total=expected THEN 'PASS' ELSE 'REVISAR' END AS status FROM checks ORDER BY kind;
