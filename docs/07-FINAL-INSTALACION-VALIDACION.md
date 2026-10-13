# DACTIVOS — Entrega 07-FINAL (misma aplicación y Supabase)

## Origen y limitaciones

El paquete se construyó únicamente a partir del ZIP SAFE `DACTIVOS_07_FINAL_SAFE_20261011-160950.zip` y el catálogo SQL proporcionado. Nunca se llamó al Supabase remoto ni se importaron credenciales. Los tests Node estructurales y de CSV pasaron localmente. **No se ejecutó TypeScript con dependencias reales, ESLint ni build de Next.js en este entorno**: lo comprobará el instalador sobre el equipo del usuario.

## Orden preciso

1. Detener `npm run dev`. Descargar y extraer paquete 07-FINAL.
2. Ejecutar `INSTALL-07FINAL.ps1`. El instalador valida SHA-256 de todas las modificaciones, ejecuta pruebas locales, TypeScript, ESLint y build. Si falla, revierte los cambios locales. No contacta Supabase.
3. Revisar `sql/07_FINAL_INSTALL.sql`. Ejecutarlo **una vez** en SQL Editor del mismo `dactivos-demo`, comprobando que se está en el proyecto correcto. Todo en un `BEGIN ... COMMIT`; no altera activos, roles o empleados al instalar; crea cuatro RPC, una tabla append-only y ajusta el guard existente de estado de activos.
4. Para habilitar invitaciones, desplegar `supabase/functions/dactivos-invite` en el MISMO proyecto Supabase. Esto NO es otro proyecto ni necesita Docker para deploy remoto. Puede desplegarse con Supabase CLI autenticado y enlazado al proyecto actual: `supabase functions deploy dactivos-invite --project-ref <ID_DEL_PROYECTO>`; no usar `--no-verify-jwt`. Revisar en Auth la URL de destino y que las invitaciones por correo funcionen. La `SUPABASE_SERVICE_ROLE_KEY` solo debe residir en los secretos del entorno Edge de Supabase, nunca en Next.js o este ZIP.
5. Arrancar `npm run dev`, navegar Dashboard, Mantenimiento, Historial, Reportes, Configuración, Usuarios y Activos. Confirmar que desaparece la advertencia `Date.now()` en desarrollo.
6. Validar roles con ADMIN y SECURITY en sesiones independientes. SECURITY no debe acceder a `/reportes`, `/usuarios`, `/configuracion` ni baja/reactivación. No crear registros reales adicionales para pruebas automáticas.

## Qué hace cada módulo

- FIX3 Next.js 16.4: `await connection()` dentro de cada árbol de página dinámico, no solo layout; mantiene `cacheComponents` y `Suspense`.
- 07B-3: invitaciones por correo mediante Edge Function (solo JWT ADMIN), Supabase Auth crea identidad, perfil inicia inactivo, RPC lo audita; luego ADMIN activa en Usuarios. Nunca insertar directamente en `auth.users`.
- 07C: historial paginado RPC con ADMIN completo y SECURITY limitado a asignaciones/mantenimiento de activos no retirados. No muestra payload JSON bruto.
- 07D: exportación administrativa CSV con paginación, BOM UTF-8, mitigación de fórmulas de hoja de cálculo, hasta 10k registros; filtro de fecha UTC.
- 07E: pantalla de configuración con estados operativos reales y enlaces; bajas y reactivaciones solo ADMIN, motivo de 10-500 caracteres, transición restringida y auditoría doble (operational_audit_log y asset_lifecycle_log).

## Riesgos y tareas NO ejecutadas

- **SQL no ha sido probado contra servidor PostgreSQL real desde este entorno.** Si falla, no fuerces cambios: envía el error exacto sin credenciales; la transacción debe revertirse si se ejecutó desde el inicio.
- **Invitación no es atómica entre Auth y base de datos** (son servicios separados). Si falla vincular perfil después de enviar la invitación, la identidad queda sin acceso y el error marca conciliación pendiente; no repetir automáticamente. Revisar el estado en Supabase Auth + perfiles antes de decidir qué hacer.
- Instalador revierte **solo archivos del proyecto**, no la migración SQL desplegada ni Edge Function. Instalar primero el código permite validar build sin ejecutar escritura de la base.
- No se prueban escrituras reales sobre datos existentes, ni invitaciones reales, ni concurrencia simultánea de dos entregas.
- La exportación CSV no garantiza una foto transaccional bajo escrituras concurrentes durante la paginación. Exportar cuando no se estén modificando los datos si se requiere consistencia estricta.
- El límite de 10 000 filas evita exportaciones parciales silenciosas. El historial pagina hasta 100 páginas x 100 eventos.
- Configuración muestra categorías existentes; no agrega edición de catálogos o nuevos parámetros no acordados.

## Reversión

`REMOVE-07FINAL.ps1` verifica primero los SHA-256 de los archivos instalados. Solo restaura el código local si no hubo modificaciones posteriores. No revierte automáticamente la base.

## Validación manual recomendada

1. Abrir `/mantenimiento` y `/dashboard`: no error `blocking-prerender-current-time`.
2. Visitar `/historial` en ADMIN y SECURITY; probar filtros sin mostrar auditorías de cuentas a SECURITY.
3. Descargar un reporte CSV como ADMIN; comprobar columnas y Excel; SECURITY bloqueado.
4. En `/activos`, ADMIN ve Dar de baja/Reactivar en estados elegibles; SECURITY no.
5. No realizar una baja/alta real ni enviar invitaciones hasta validar SQL/Edge y contar con una cuenta o activo apto para prueba controlada.
