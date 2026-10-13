# DACTIVOS — Épica 06B-3

## Alcance

Este paquete añade **pruebas locales** al mismo proyecto DACTIVOS. Utiliza un backend simulado para verificar que el frontend y los Server Actions gestionan rechazos de concurrencia, restricciones y errores de PostgreSQL sin reintentos automáticos. También revisa el comportamiento de la UI existente, las protecciones de confirmación y las rutas.

**No prueba concurrencia real de PostgreSQL.** Demostrarla requiere dos transacciones/escrituras simultáneas contra la base y datos de prueba explícitamente autorizados. No se ejecutará sin acordar alcance y reversibilidad. 

El usuario ha pedido una única base Supabase y preservar sus registros, por lo que NO se crean recursos de QA, NO se despliegan repositorios, NO se crean registros ni se invocan RPC reales. Las verificaciones de integridad del esquema actual se pueden ejecutar aparte mediante SQL de solo lectura facilitado directamente en el chat.

## Reglas

- Nunca usar service_role ni permisos de administrador para simular un usuario.
- No modificar `.env.local`, RLS, funciones, tablas ni datos.
- Conservar las pruebas 06B-1 y 06B-2.
- Nuevas pruebas: `tests/06b/regression-races.test.mjs` y `tests/06b/regression-ui.test.mjs`.
- No interpretar pruebas mock como evidencia de atomicidad de PostgreSQL real.

## Ejecución

```powershell
Set-Location 'C:\Users\Aaron Gutierrez\dactivos'
node --test tests/06b/regression-races.test.mjs tests/06b/regression-ui.test.mjs
npx tsc --noEmit
npx eslint .
npm run build
```

El instalador ejecuta estas comprobaciones automáticamente. La instalación agrega exclusivamente archivos nuevos, revisa hashes de los archivos fuente esperados y retira los agregados si falla la validación. El desinstalador independiente verifica hashes antes de eliminarlos.

## Evidencia y pendientes

- PASS en pruebas mock: contratos de Server Actions, propagación de rechazos, no reintentos, no escrituras si falta confirmación.
- PASS estructural: restricciones de UI y ausencia de `force-dynamic`.
- Las pruebas 06A-1 verificaron en un momento anterior que no había asignaciones duplicadas ni inconsistencias; eso no demuestra que no aparecerán en condiciones futuras.
- **PENDIENTE, no aprobado por este paquete**: prueba HTTP de concurrencia real con PostgreSQL; escenarios de datos restringidos ausentes; denegación HTTP de operaciones de escritura con SECURITY; usuario inactivo/sin perfil.
