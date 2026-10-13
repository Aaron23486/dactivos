# DACTIVOS 06B-2 — Validacion HTTP de solo lectura con JWT reales

Ejecucion: `node tests/06b/auth-readonly.mjs` desde la raiz de DACTIVOS.

## Alcance

- Verifica sesion e identidad real en Supabase Auth de ADMIN y SECURITY.
- Verifica `current_app_role` para ambas cuentas.
- Verifica las seis RPC de consulta en cada rol.
- Compara la visibilidad ADMIN/SECURITY sobre activos retirados y catalogos inactivos, cuando esos registros existan.
- Verifica que PostgREST rechace un JWT malformado.

## Limitaciones expresas

- No llama RPC de escritura (incluyendo intentos fallidos), por lo que NO prueba aun la denegacion SQL de escritura ADMIN-only.
- No crea usuarios, empleados, departamentos ni activos; no modifica tablas operativas, RLS o auditorias.
- El login crea sesiones de autenticacion transitorias en Supabase; el script intenta cerrarlas.
- Los casos con datos restringidos ausentes se informan SKIP, nunca PASS.
- No prueba concurrencia ni la autorizacion de Server Actions HTTP; esas pruebas requieren otra etapa.

## Credenciales

- Las contrasenas se escriben en la terminal con eco oculto; no se guardan en archivos ni variables de entorno.
- Nunca pegues contrasenas, tokens o cookies en la conversacion.
- Confirma que el hostname de Supabase corresponde a tu proyecto actual antes de ejecutar.
- Si no tienes una cuenta SECURITY activa, cancela con Ctrl+C; no cambies roles solo para completar la prueba.
