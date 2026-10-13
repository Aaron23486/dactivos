# DACTIVOS 06B-4 FIX1 — Firma real de RPC Departamentos

La consulta SQL del mismo Supabase (`pg_proc.proargnames`) reveló:
`dactivos_set_department_active(uuid, boolean)` usa los nombres
`p_department_id`, `p_is_active`. El SQL original del paquete 05E usaba
`p_active`; **la instancia actual no coincide exactamente con aquel archivo**.

Se corrige exclusivamente el nombre del argumento en:
- `src/app/actions/operations.ts` (acción de activar/desactivar departamentos).
- `tests/06b/admin-denials-safe.mjs` (ensayo con argumentos NULL).

Se agrega una prueba automática local contra mocks que valida el nombre exacto
`p_is_active`, los dos valores booleanos, la exigencia de confirmación y la
denegación previa para SECURITY.

## Seguridad

- NO cambiar o recrear funciones en Supabase. No se actualizan tablas, grants,
  roles ni credenciales.
- El instalador compara SHA256 antes de reemplazar dos archivos, rechaza bases
  distintas y restaura los originales si alguna validación falla.
- Antes de **repetir la prueba HTTP** 06B-4, revisar la función REAL actual en
  Supabase SQL Editor con:

```sql
SELECT pg_get_functiondef(
  'public.dactivos_set_department_active(uuid,boolean)'::regprocedure
) AS definicion;
```

Confirmar que `auth.uid()` y rol ADMIN se validan **antes** de cualquier
cambio y que `NULL` para `p_department_id` y `p_is_active` provoca `22023`
para ADMIN, sin cambios. Para SECURITY debe devolver `42501`. Si no coincide,
NO ejecutar `node tests/06b/admin-denials-safe.mjs`; compartir la definición
para adaptar la prueba con seguridad.

El instalador ejecuta pruebas locales, TypeScript, ESLint y compilación de
Next.js. **No invoca las RPC reales ni pide contraseñas.**

La prueba HTTP sigue siendo opcional y manual; su comparación de departamentos
NO equivale a confirmar que todas las tablas de auditoría no cambiaron.
