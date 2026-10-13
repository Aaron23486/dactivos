# Arquitectura de DACTIVOS

## Flujo de datos

```text
Navegador
   │ Next.js 16 App Router / React 19
   ▼
Server Components y Server Actions
   │ requirePermission(permiso)
   │ Supabase Auth getUser + current_app_role
   ▼
Supabase (SSR, credencial pública + JWT del usuario)
   │ PostgREST / RPC autorizadas
   ▼
PostgreSQL: controles de acceso, RLS, transacciones y auditoría
```

El inicio de sesión se realiza mediante Supabase Auth. Las operaciones sensibles se implementan mediante RPC de PostgreSQL, con comprobaciones de rol y restricciones de negocio en la base de datos, además de controles en servidor. La interfaz no determina la autorización por sí sola.

## Dominios

- **Catálogo:** `assets`, `asset_categories`, `employees`, `departments`.
- **Operación:** `asset_assignments`, `asset_return_inspections`, `asset_maintenance_cases`, `asset_release_validations`, `asset_release_consumptions`.
- **Auditoría:** registros de asignaciones, mantenimiento, movimientos operativos, acceso administrativo y ciclo de vida.
- **Identidad:** `auth.users` de Supabase y perfiles en `public.profiles`.

## Estados y reglas

El inventario distingue `AVAILABLE`, `ASSIGNED`, `MAINTENANCE` y `RETIRED`. Las entregas y devoluciones se verifican en la base; un colaborador no puede mantener dos asignaciones abiertas de la misma categoría. Los equipos en mantenimiento requieren resolución y liberación física antes de volver a circular. Las bajas se auditan.

## Estructura del repositorio

- `src/app`: rutas, páginas, acciones de servidor y API de reportes.
- `src/components`: dashboard, tableros operativos y componentes UI.
- `src/lib`: autenticación, Supabase, contratos y exportación CSV.
- `supabase/functions/dactivos-invite`: invitación administrativa mediante Edge Function.
- `sql`: ampliaciones SQL incrementales del desarrollo original.
- `supabase/catalogo`: extracción de metadatos estructurales (solo lectura) para preparar la instalación reproducible.
- `tests`: pruebas automatizadas de contratos, permisos, regresión y componentes.
- `docs/screenshots`: cinco capturas de una instancia local con datos ficticios.

## Límites del proyecto publicado

No se incluye el contenido de la base de demostración, ni el esquema de autenticación gestionado internamente por Supabase. El script de exportación de catálogo genera metadatos públicos de `public` que deben revisarse antes de compartir. Las migraciones completas aún requieren comparar el catálogo con los SQL históricos.
