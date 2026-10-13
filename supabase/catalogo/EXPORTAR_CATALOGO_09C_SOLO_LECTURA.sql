-- DACTIVOS 09C | Exportacion de esquema estructural, SIN registros personales.
-- UNICAMENTE SELECT sobre pg_catalog/information_schema; no afecta datos.
-- Ejecutar en SQL Editor como owner de dactivos-demo. NO ejecutar sobre otras BD.
-- Salida: una celda catalogo_json. Descargar resultado en CSV/JSON; revisar
-- los cuerpos de funciones y politicas antes de compartir (podrian contener
-- literales privados escritos anteriormente en el SQL por el desarrollador).
-- Esto NO exporta tablas auth.*, identidades, datos operativos ni el respaldo.
WITH tablas AS (
  SELECT c.oid, c.relname, c.relkind, c.relrowsecurity AS rls,
         c.relforcerowsecurity AS force_rls
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND c.relname IN (
      'profiles','asset_categories','departments','employees','assets',
      'asset_assignments','asset_return_inspections',
      'asset_maintenance_cases','asset_release_validations',
      'asset_release_consumptions','assignment_audit_log',
      'maintenance_audit_log','operational_audit_log',
      'admin_audit_log','asset_lifecycle_log'
    )
),
columnas AS (
 SELECT jsonb_agg(jsonb_build_object(
   'table',t.relname,'position',a.attnum,'name',a.attname,
   'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'identity',a.attidentity,
   'generated',a.attgenerated,
   'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid)
 ) ORDER BY t.relname,a.attnum) AS contenido
 FROM tablas t
 JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid
  AND a.attnum>0 AND NOT a.attisdropped
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
),
restricciones AS (
 SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',co.conname,'type',co.contype,
  'definition',pg_catalog.pg_get_constraintdef(co.oid,true)
 ) ORDER BY t.relname,co.conname) AS contenido
 FROM tablas t JOIN pg_catalog.pg_constraint co ON co.conrelid=t.oid
),
indices AS (
 SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',i.relname,'definition',pg_catalog.pg_get_indexdef(idx.indexrelid)
 ) ORDER BY t.relname,i.relname) AS contenido
 FROM tablas t JOIN pg_catalog.pg_index idx ON idx.indrelid=t.oid
 JOIN pg_catalog.pg_class i ON i.oid=idx.indexrelid
),
policies AS (
 SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',pol.polname,
  'command',pol.polcmd,'permissive',pol.polpermissive,
  'roles',ARRAY(SELECT pg_catalog.pg_get_userbyid(r) FROM unnest(pol.polroles) AS r),
  'using',pg_catalog.pg_get_expr(pol.polqual,pol.polrelid),
  'with_check',pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid)
 ) ORDER BY t.relname,pol.polname) AS contenido
 FROM tablas t JOIN pg_catalog.pg_policy pol ON pol.polrelid=t.oid
),
triggers AS (
 SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',tr.tgname,
  'definition',pg_catalog.pg_get_triggerdef(tr.oid,true),
  'enabled',tr.tgenabled
 ) ORDER BY t.relname,tr.tgname) AS contenido
 FROM tablas t JOIN pg_catalog.pg_trigger tr ON tr.tgrelid=t.oid
 WHERE NOT tr.tgisinternal
),
enums AS (
 SELECT jsonb_agg(jsonb_build_object(
   'name',q.typname,'values',q.values
 ) ORDER BY q.typname) AS contenido FROM (
  SELECT typ.typname,jsonb_agg(en.enumlabel ORDER BY en.enumsortorder) AS values
  FROM pg_catalog.pg_type typ
  JOIN pg_catalog.pg_namespace n ON n.oid=typ.typnamespace
  JOIN pg_catalog.pg_enum en ON en.enumtypid=typ.oid
  WHERE n.nspname='public' GROUP BY typ.oid,typ.typname
 ) q
),
funciones AS (
 SELECT jsonb_agg(jsonb_build_object(
  'signature',p.oid::regprocedure::text,
  'security_definer',p.prosecdef,
  'definition',pg_catalog.pg_get_functiondef(p.oid),
  'acl',p.proacl::text
 ) ORDER BY p.proname,p.oid::regprocedure::text) AS contenido
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind IN ('f','p')
 AND p.prorettype <> 'pg_catalog.event_trigger'::pg_catalog.regtype
),
tablas_json AS (
 SELECT jsonb_agg(jsonb_build_object(
  'name',relname,'kind',relkind,'rls',rls,'force_rls',force_rls,
  'acl',(SELECT c.relacl::text FROM pg_catalog.pg_class c WHERE c.oid=tablas.oid)
 ) ORDER BY relname) AS contenido FROM tablas
),
secuencias AS (
 SELECT jsonb_agg(jsonb_build_object('name',c.relname,
  'type',pg_catalog.format_type(seq.seqtypid,NULL),
  'start',seq.seqstart,'increment',seq.seqincrement,
  'minimum',seq.seqmin,'maximum',seq.seqmax,'cache',seq.seqcache,
  'cycle',seq.seqcycle,'acl',c.relacl::text
 ) ORDER BY c.relname) AS contenido
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_sequence seq ON seq.seqrelid=c.oid
 WHERE n.nspname='public'
)
SELECT jsonb_pretty(jsonb_build_object(
 'export','DACTIVOS_SCHEMA_CATALOGO_09C','source_schema','public',
 'table_count',(SELECT count(*) FROM tablas),
 'tables',COALESCE((SELECT contenido FROM tablas_json),'[]'::jsonb),
 'columns',COALESCE((SELECT contenido FROM columnas),'[]'::jsonb),
 'constraints',COALESCE((SELECT contenido FROM restricciones),'[]'::jsonb),
 'indexes',COALESCE((SELECT contenido FROM indices),'[]'::jsonb),
 'policies',COALESCE((SELECT contenido FROM policies),'[]'::jsonb),
 'triggers',COALESCE((SELECT contenido FROM triggers),'[]'::jsonb),
 'enums',COALESCE((SELECT contenido FROM enums),'[]'::jsonb),
 'functions',COALESCE((SELECT contenido FROM funciones),'[]'::jsonb),
 'sequences',COALESCE((SELECT contenido FROM secuencias),'[]'::jsonb)
)) AS catalogo_json;
