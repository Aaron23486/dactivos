# DACTIVOS — 06B-5 | Concurrencia real controlada

**Mismo proyecto `dactivos` y Supabase `dactivos-demo`.**

## Alcance

1. `node tests/06b/concurrency-real-noop.mjs` inicia sesion real ADMIN con Auth.
2. Lee `dactivos_list_departments` y selecciona un departamento existente.
3. Envia **12 solicitudes HTTP simultaneas reales** a `dactivos_set_department_active` solicitando exactamente el mismo `is_active` actual.
4. La definicion SQL compartida por el propietario el 11/10/2026 comprueba ADMIN, hace `SELECT ... FOR UPDATE` y, si ya tiene el estado pedido, devuelve `false` sin ejecutar `UPDATE`.
5. Compara el conjunto de departamentos antes y despues; nunca imprime registros.

## Limites y riesgo

- No se crean registros ni se alteran migraciones o credenciales.
- La RPC tiene capacidad de escritura: **si otro usuario cambia el estado durante las solicitudes, existe una condicion de carrera que podria provocar una modificacion**. No ejecutar con actividad paralela de administracion de departamentos. Es una prueba de no-op esperada, no una garantia formal de ausencia de escrituras.
- Una respuesta `false` comprueba la ruta de no-op y su transaccion. Aunque los 12 HTTP se lanzan simultaneamente, no demuestra por si sola contention ni exclusividad temporal: pueden procesarse secuencialmente por el servidor.
- No demuestra que dos asignaciones del mismo activo se resuelvan correctamente con concurrencia real. Ese escenario permanece pendiente para una prueba aislada y autorizada con su propio contrato.
- La lista RPC no es un historial de auditoria. Solo PostgreSQL puede verificar integridad historica de triggers/eventos.
- Antes de ejecutar, confirmar que el SQL sigue siendo el mostrado en 06B-4 y que no hay otros operadores editando departamentos.

## Complemento opcional: bloqueo PostgreSQL simultaneo sin alterar tablas

Abrir dos pestanas independientes de **Supabase SQL Editor** (si las consultas corren sobre conexiones concurrentes):

En **A**, ejecutar esta sentencia e inmediatamente iniciar B mientras A espera 15 segundos:

```sql
WITH acquired AS MATERIALIZED (
  SELECT pg_catalog.pg_advisory_xact_lock(160625, 15) AS held
)
SELECT pg_catalog.pg_sleep(15) FROM acquired;
```

En **B**, durante los 15 segundos:

```sql
SELECT pg_catalog.pg_try_advisory_xact_lock(160625, 15) AS acquired;
```

Esperado `false` si A todavia mantiene su bloqueo. Despues de que A termine, repetir B; se espera `true`. Son bloqueos **consultivos y transaccionales**: no editan registros ni prueban la carrera de asignaciones. Si el SQL Editor ejecuta las pestanas en la misma conexion/secuencia, el resultado es no concluyente; detenerse y registrar SKIP, no PASS.

## Resultado

- PASS: identidad ADMIN, lectura inicial, 12 RPC con `false`, instantaneas identicas.
- FAIL: error, otra respuesta, diferencias, timeout, identidad distinta.
- SKIP: no se prueban asignaciones simultaneas ni auditoria SQL con este script.
