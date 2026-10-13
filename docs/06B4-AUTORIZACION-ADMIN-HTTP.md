# DACTIVOS — 06B-4 / Denegaciones administrativas HTTP

**Ambito:** Un proyecto local `dactivos` y su Supabase actual. No requiere otro proyecto, ni GitHub ni Docker.

## Que prueba

- ADMIN y SECURITY se autentican con Supabase Auth real y `current_app_role()` verifica su rol.
- Tres RPC administrativas de Departamentos reciben solo parametros NULL. Bajo las funciones 05E verificadas:
  - SECURITY debe recibir `42501` antes de validar los argumentos.
  - ADMIN debe recibir `22023` por argumentos invalidos, antes de cualquier escritura.
- El listado de departamentos de ADMIN se compara antes y despues (solo lectura).
- Nada se guarda en disco: JWT y contrasenas viven solo en memoria del proceso.

## Limites, precauciones

Aunque nunca se envian datos validos, se invocan FUNCIONES CAPACES DE ESCRIBIR cuando reciben parametros validos. Por tanto solo ejecutar si las implementaciones SQL 05E NO han sido modificadas. El script pide confirmacion explicita.

Si una RPC devuelve algo distinto del codigo esperado, **las pruebas restantes se detienen**, y el resultado queda FAIL. No reintentar ni cambiar permisos automaticamente. Es imposible demostrar ausencia de cambios en todas las tablas de auditoria solo desde las RPC de consulta: la comparacion verifica exclusivamente el catalogo de departamentos.

No se prueban operaciones ADMIN reales con datos validos, cuentas sin perfil, ni autorizacion de otros RPC o rutas. Tampoco se prueba concurrencia real. Estos escenarios siguen pendientes hasta que se puedan ejecutar de manera segura.

## Como usar

1. Confirma en Supabase SQL Editor que las definiciones vigentes de `dactivos_create_department(text,text)`, `dactivos_update_department(uuid,text)` y `dactivos_set_department_active(uuid,boolean)` comprueban `auth.uid()` y el rol ADMIN antes de validar los parametros y antes de `INSERT`/`UPDATE`.
2. Ejecuta `node tests/06b/admin-denials-safe.mjs` desde la carpeta del proyecto en una terminal interactiva.
3. Confirma el hostname de TU proyecto Supabase, introduce credenciales ADMIN y SECURITY localmente.
4. No publiques las credenciales, JWT ni correos. Comparte solo PASS/FAIL/SKIP/resumen.
5. Cualquier FAIL exige detenerse y analizar el problema; no reintentar automaticamente.

**Codigo de salida:** 0 si no hay FAIL; 1 si hay algun FAIL. La presencia de SKIP no equivale a aprobacion.

## Nota de seguridad

La prueba de `authenticated` con permiso EXECUTE no es igual a autorizacion operativa: la RPC necesita volver a comprobar el rol en PostgreSQL. Esta prueba comprueba 3 RPC de Departamentos, pero no reemplaza pruebas completas de RLS y de otras RPC.
