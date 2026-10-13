# DACTIVOS 07B-2 — Administración de perfiles existentes

## Alcance
- Mismo Supabase `dactivos-demo`, sin cuentas nuevas ni servicio privilegiado en Next.js.
- Solo ADMIN puede modificar rol y estado de perfiles YA vinculados a `auth.users`.
- Prohíbe modificar la propia cuenta, desactivar al último ADMIN y activar cuentas no confirmadas.
- Justificación 10–500 caracteres obligatoria; auditoría en `public.admin_audit_log`.
- RPC `dactivos_admin_set_user_access(uuid,text,boolean,text)` protegida y atómica.

## Instalación en orden
1. Antes de ejecutar SQL, revisar el archivo de referencia `sql/07B2_INSTALAR_RPC_ADMIN_ACCESO.sql` en el paquete y **copiar SQL desde el mensaje de ChatGPT**. Ejecutar una sola vez en el SQL Editor del Supabase actual.
2. Verificar seguridad de la función: `SECURITY DEFINER` true, `search_path=""`, anon false, authenticated true.
3. Ejecutar `INSTALL-07B2.ps1` desde PowerShell 5.1 en Windows. No toca Supabase ni variables de entorno.
4. Abrir `/usuarios` con ADMIN, verificar el formulario. No modificar cuentas reales innecesariamente: basta revisión visual.
5. Con SECURITY comprobar que no entra a `/usuarios`.

## Reglas SQL
- El lock asesor transaccional `(706, 2026)` serializa modificaciones realizadas **mediante esta RPC**. No protege cambios ejecutados fuera de ella (SQL Editor o otros mecanismos privilegiados).
- `admin_audit_log.id` debe autogenerarse; el SQL comprueba esto antes de crear la función. Si falla, NO corregirlo a ciegas: inspeccionar identidad/sequence.
- `current_app_role()` lee `profiles` en cada llamada; usuarios desactivados pierden acceso a RPC protegidas, aunque un JWT pueda seguir siendo válido durante su vigencia.
- Una operación idéntica devuelve `false` sin crear auditoría.
- En sesiones simultáneas, la RPC verifica los permisos y usa bloqueos antes de mutar los perfiles.

## Pendiente — creación de identidades
NO crear usuarios con `INSERT INTO auth.users` ni introducir una `service_role` en la aplicación web. Para nuevas cuentas utilizaremos después invitación por un entorno seguro administrado. Tampoco vinculamos perfiles ausentes en 07B-2.

## Reversión
`RESTORE-07B2.ps1` solo restaura archivos locales, con comprobación de hashes. No elimina la RPC ni los registros de auditoría que pudieran haberse generado. Toda reversión de migraciones de base requiere revisión aparte.
