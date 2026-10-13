# DACTIVOS 06B-1 — Automatizacion sin modificar la BD

## Alcance

Se incluyen suites ejecutadas con Node.js `node:test` y TypeScript ya declarado en las dependencias. No se modifica codigo de la aplicacion, no se cambian migraciones ni se instalan librerias nuevas.

- `permissions.test.mjs`: RBAC (ADMIN y SECURITY).
- `contracts.test.mjs`: parsers de datos que entregan RPC.
- `actions.test.mjs`: validaciones, confirmaciones y rutas de RPC simuladas en memoria, sin red.
- `security-structure.test.mjs`: controles estaticos de operaciones, permisos y secretos.
- `anon-readonly.mjs`: chequeo HTTP **opcional** solo de lectura con la clave publica local; no usa contrasenas ni modifica registros. Necesita conexion y proyecto Supabase activo.

## Ejecutar

En PowerShell, desde `C:\Users\Aaron Gutierrez\dactivos`:

```powershell
node --test tests/06b/permissions.test.mjs tests/06b/contracts.test.mjs tests/06b/actions.test.mjs tests/06b/security-structure.test.mjs
npx tsc --noEmit
npx eslint .
npm run build
```

Si quieres probar denegacion anonima (solo lectura):

```powershell
node tests/06b/anon-readonly.mjs
```

El script `anon-readonly` necesita variables publicas configuradas y conectividad. **No lo ejecutes** si no deseas siquiera consultas anonimas a tu Supabase.

## Interpretar los resultados

PASS = control local probado con el codigo actual.
FAIL = no aceptar la etapa 06B-1, revisar diferencias.
INCONCLUSO = falta disponibilidad de red o dependencia.

Ninguna prueba simulada demuestra la autorizacion real en PostgreSQL. Queda **pendiente 06B-2**: pruebas controladas HTTP/JWT reales ADMIN y SECURITY, comparacion de las funciones SQL instaladas con migraciones versionadas y evaluacion de concurrencia, sin modificar datos reales. No registrar JWT ni contrasenas en reportes.

## Portabilidad del portafolio

`.env.example` NO incluye la URL real ni claves de tu Supabase. Cada persona debe configurar su proyecto y su archivo `.env.local` privado.
**Pendiente esencial:** aportar esquema inicial completo de PostgreSQL, funciones, triggers, RLS, permisos y procedimiento seguro para crear ADMIN. Las migraciones 05 y 05E no sustituyen ese esquema inicial; no se puede asegurar que un clon funcione desde cero hasta empaquetar y probar el esquema integral en una base limpia ajena a tus datos.
