# DACTIVOS 07B-1 — Directorio de usuarios (solo ADMIN)

- Usa el proyecto local `C:\Users\Aaron Gutierrez\dactivos` y tu unico Supabase `dactivos-demo`.
- **Esta instalacion FIX1 no requiere SQL:** la RPC 07B-1 ya esta instalada y verificada en el mismo Supabase. `sql/07B1_INSTALAR_RPC_SOLO_LECTURA.sql` es una copia local del contrato para la prueba estatica y NO debe ejecutarse nuevamente.
- La RPC retorna solo ID, correo, rol, activo, confirmación y tiempos de acceso, con máximo 500 cuentas (aviso UI).
- Valida identidad con `auth.uid()` y ADMIN via `current_app_role()`; `SECURITY DEFINER` con `search_path=''`.
- REVOKE PUBLIC y anon, GRANT EXECUTE authenticated; dentro de la función SECURITY recibe 42501.
- La capa Next.js exige `requirePermission('users.manage')` ANTES de realizar la consulta.
- Esta etapa no incorpora API Admin Auth ni requiere secretos `service_role`. No inserta, edita o elimina usuarios.
- Las cuentas Auth sin perfil aparecen 'Sin perfil válido'; ello es diagnóstico y no les da acceso a la app.
- Para probar: instalar ZIP FIX1, `npm run dev` y abrir `/usuarios` como ADMIN. SECURITY no debe ver Usuarios en el menú y la URL debe denegar acceso.
- Si la RPC falta, se muestra error en UI en vez de presentar cero usuarios.
- Próxima fase 07B-2: revisar estructura de perfiles, auditoría y protección del último ADMIN antes de cambios de rol/estado.
- SQL de instalación de esta etapa altera esquema al crear una función; NO toca datos/credenciales/permisos de tablas.

- Correccion FIX1: el instalador incluye el SQL de contrato en el manifiesto y lo instala localmente; esta operacion no lo ejecuta.
