# DACTIVOS 07-FINAL · Aceptación segura de invitaciones

## Objetivo

Este complemento integra un **paso de aceptación manual** y la creación de contraseña mediante Supabase Auth. La invitación sale de la Edge Function `dactivos-invite` existente y vincula el perfil como **inactivo**. No crea otro proyecto Supabase ni cambia tablas, RLS o funciones SQL.

## 1. Instalación local

Ejecutar `INSTALL-CIERRE-INVITACIONES.ps1` con PowerShell 5.1 desde la carpeta extraída. Confirma las validaciones: pruebas, TypeScript, ESLint y build.

## 2. Ajustes obligatorios de Supabase Auth

En el proyecto **dactivos-demo**, Authentication → URL Configuration:
- Para pruebas locales: **Site URL = http://localhost:3000**. En producción debe ser **la URL HTTPS real de DACTIVOS** (no mantener localhost como URL de los correos enviados a otras personas).
- Añadir a Redirect URLs los orígenes/rutas propios de DACTIVOS según el entorno; **nunca** agregar un wildcard público amplio ni redirecciones a dominios ajenos.

En Authentication → Email Templates → **Invite user**, cambiar el vínculo principal por:

```html
<a href="{{ .SiteURL }}/aceptar-invitacion?token_hash={{ .TokenHash }}&amp;type=invite">Aceptar invitación a DACTIVOS</a>
```

IMPORTANTE: este vínculo usa `TokenHash` y **no** `ConfirmationURL`. No cambiar otros templates innecesariamente. La página no consume el token al cargar (protege frente a previsualizaciones/prefetch); solo al pulsar *Aceptar invitación* se realiza `verifyOtp(type: "invite")` en Server Action. La sesión queda en cookies SSR, se pide contraseña y al finalizar se cierra sesión. Una cuenta seguirá inactiva hasta que ADMIN la active.

## 3. Desplegar Edge Function existente (sin Docker)

```powershell
Set-Location "C:\Users\Aaron Gutierrez\dactivos"
npx --yes supabase@latest login
npx --yes supabase@latest functions deploy dactivos-invite --project-ref zkzfzuakzvdknwnvqivy --use-api
```

**No** usar `--no-verify-jwt`. La Edge Function verifica JWT y exige ADMIN por RPC antes de llamar a `auth.admin.inviteUserByEmail`. Comprueba que `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` sean accesibles en su **entorno de Edge Functions**, sin copiarlas al cliente. Las variables heredadas se encuentran disponibles por defecto en Supabase hosted. Si falta alguna, no incluir ninguna clave privada en `.env.local` de Next.js ni en este chat; revisa el proyecto y la configuración de las claves con el panel de Supabase.

## 4. Prueba funcional controlada

- Consultar primero la auditoría read-only de permisos RPC. Debe mostrar `security_definer=true`, `anon_execute=false`, `authenticated_execute=true` y `search_path` limitado.
- Como ADMIN, invitar **una sola cuenta de correo propia de prueba** con rol SECURITY y motivo suficiente, tras confirmar correo y URL de destino.
- Abrir el correo, pulsar link de invitación, luego pulsar **Aceptar invitación** en la página, establecer contraseña y confirmar el mensaje de cuenta pendiente.
- Antes de activarla verificar que no se permita acceder a Dashboard. Luego ADMIN habilita SECURITY desde `/usuarios` con motivo; volver a iniciar sesión y comprobar que SECURITY no tenga acceso a `/usuarios`, `/reportes`, `/configuracion`.
- No usar datos reales ni editar roles de cuentas de producción para esta prueba. Cuentas e invitaciones quedan registradas en Auth y auditoría; son cambios REALES.

## 5. Limitaciones

- Si Auth crea identidad pero la RPC de vinculación falla, queda usuario **sin permisos**, en espera de conciliación por ADMIN. No reenviar indiscriminadamente sin comprobar el estado en Auth/Usuarios.
- El correo del servicio Supabase y los límites SMTP deben estar configurados para entregar invitaciones.
- Se requieren pruebas de extremo a extremo para dar por cerrado el flujo en producción.
