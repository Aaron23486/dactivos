# DACTIVOS — Gestión y trazabilidad de activos tecnológicos

Aplicación web interna para handhelds y computadoras. Ciclo: REGISTRAR → DISPONIBLE → ENTREGAR → ASIGNADO → DEVOLVER → DISPONIBLE (o, si vuelve dañado, MANTENIMIENTO → RESOLVER → REVISIÓN FÍSICA → DISPONIBLE); DISPONIBLE → BAJA → REACTIVAR.

## Antes de hacer cualquier cosa

1. Lee `docs/requirements.md` (requisitos FR/NFR, reglas R1-R13) y `docs/architecture.md` (principios, modelo de datos, decisiones D1-D14) cuando la tarea los necesite.
2. Revisa el ADR correspondiente en `docs/decisions/` antes de cambiar una decisión existente.
3. Lee `AGENTS.md`: Next.js 16 cambia APIs y convenciones; consulta la guía en `node_modules/next/dist/docs/` antes de escribir código de Next.

Fuentes de verdad, en orden: `docs/requirements.md` > ADR y decisiones de `docs/architecture.md` > principios de `docs/architecture.md`.
Si hay conflicto o falta información: pregunta. No asumas requisitos.

## Estado

Versión **1.1.0** (2026-10-28), repositorio público. README y `docs/` en inglés; la interfaz y este archivo siguen en español a propósito. Historial en `CHANGELOG.md`. `main` protegida: todo cambio entra por PR con `checks`, `supply-chain` e `integration` en verde.
Cambios nuevos: documentar primero en `docs/requirements.md`, `docs/architecture.md` o un ADR nuevo, y agregar sus pruebas a `docs/testing.md`. Las referencias en código y en los nombres de las pruebas usan los IDs estables (FR-n, NFR-n, Rn, Dn).

## Reglas críticas (nunca violar)

- Solo dos roles (`ADMIN`, `SECURITY`). Sin registro público ni OAuth. Las cuentas llegan por invitación desde Usuarios (ADR 0006) o con `npm run create-admin` / `npm run users` (ADR 0007).
- La base de datos es la frontera de autorización (ADR 0002): ninguna tabla tiene privilegios para `anon` ni `authenticated`. Toda operación nueva es una función `SECURITY DEFINER` con `search_path = ''` que comprueba el rol con `current_app_role()` antes de todo, con `REVOKE ALL … FROM PUBLIC, anon, authenticated` y `GRANT EXECUTE` solo donde la app la necesita.
- Nunca usar la clave secreta ni `service_role` en `src/` ni en variables `NEXT_PUBLIC_`; el navegador no habla con Supabase. La clave de servicio solo existe en la Edge Function y en los comandos de terminal.
- Un activo tiene como máximo una entrega abierta, y un empleado una por categoría (R2, R3), garantizado en la base. El estado de un activo nunca se elige a mano (R5).
- Una devolución dañada abre mantenimiento; resolver no libera el equipo: hace falta la revisión física (ADR 0004).
- La auditoría la escribe la base en la misma transacción; el registro de bajas es inmutable (ADR 0005).
- Toda regla de negocio lleva su prueba, de integración si la aplica la base.
- No guardar secretos ni credenciales en el repo; `.env.local` solo lleva valores públicos.

## Forma de trabajo

Por unidad: analizar → explicar → identificar riesgos → implementar → probar → verificar que nada se rompió → resumir → indicar pendientes. Una rama `tipo/descripcion-en-ingles` y un PR por unidad. Al cerrar una unidad, actualiza `CHANGELOG.md` si el cambio es notable.

## Comandos

Node ≥ 22.18 y Docker. Todo se ejecuta desde la raíz.

```
npm ci                        # versiones exactas del lockfile, incluida la CLI de Supabase
npm run db:up                 # Supabase local en Docker; aplica las migraciones
npm run env:local             # escribe .env.local con la URL y la clave pública locales
npm run demo:setup            # cuentas @demo.dactivos.test (una por rol, contraseñas generadas
                              # mostradas una vez) y datos ficticios; solo contra Supabase local (ADR 0008)
npm run create-admin          # primer ADMIN (pregunta correo y contraseña o usa ADMIN_*)
npm run users -- list         # cuentas: list | create [--role SECURITY|ADMIN] | activate <correo>
                              #          | deactivate <correo> | reset-password <correo>
npm run dev                   # http://localhost:3000
npm run format:check | lint | typecheck | test | build
npm run check                 # formato, tipos, lint, pruebas y build
npm run test:integration      # contra el Supabase local; requiere db:up
npm run test:e2e              # Playwright sobre un build de producción (:3100); requiere db:up
                              # (E2E_BROWSER_CHANNEL=msedge usa el Edge instalado)
npm run test:coverage         # unitarias y de código con umbral mínimo de cobertura (85 %)
npm run db:reset              # recrea la base local desde las migraciones (borra los datos locales)
npm run db:status             # URLs de la API, Studio y Mailpit (correos de invitación)
```

- Cambios al esquema: una migración nueva en `supabase/migrations/` (nunca editar una ya aplicada en otro ambiente), probada con `npm run db:reset` y con pruebas en `tests/integration/`.
- Los scripts de `scripts/` son TypeScript que ejecuta Node directamente: imports con extensión `.ts` y solo sintaxis que se pueda borrar (sin `enum` ni propiedades de parámetro).
- Seguridad (medidas, limitaciones, despliegue): `docs/security.md`. Qué prueba cubre cada regla: `docs/testing.md`.
