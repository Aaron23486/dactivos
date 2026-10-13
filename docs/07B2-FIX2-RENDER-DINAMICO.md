# DACTIVOS 07B-2 FIX2 — Next 16 Date.now durante prerender

## Diagnostico

Con `cacheComponents: true` y `partialPrefetching: true`, la salida `next dev` reporto `unstable value Date.now() while prerendering` en rutas privadas, apuntando a `DashboardLayout` al montar `<DashboardContent>`; `next build` y respuestas HTTP 200 siguieron correctas. No hay `Date.now()` en el layout de origen; las dependencias de autenticacion pueden requerir tiempo dinamico.

## Intervencion minima

Agrega `await connection()` inmediatamente ANTES de `requirePermission('dashboard.read')` dentro de `DashboardContent`, tras importar `connection` desde `next/server`. La app ya cuenta con `<Suspense>` por encima del componente. No usa `dynamic='force-dynamic'`. Mantiene la verificacion de permisos y la proteccion RLS/RPC.

Documentacion Next.js: https://nextjs.org/docs/messages/next-prerender-current-time y https://nextjs.org/docs/app/getting-started/partial-prerendering

## Recomendaciones de verificacion

1. Antes de instalar, detener `npm run dev` con Ctrl+C para que no interfiera en el build.
2. Correr el instalador. Comprueba tests, tsc, eslint, build.
3. Ejecutar `npm run dev` y navegar por `/dashboard`, `/activos`, `/empleados`, `/departamentos`, `/usuarios` en sesion ADMIN.
4. Confirmar que NO reaparezca el mensaje `unstable value Date.now()` en la consola.
5. Verificar login/logout y bloqueo de SECURITY en `/usuarios`.
6. Si persiste la advertencia, reportar el texto exacto. NO encadenar mas parches especulativos.

El instalador no accede a Supabase, no modifica SQL, no expone secretos ni toca las cuentas. No interpreta build correcto como comprobacion de runtime.
