# Esquema inicial reproducible — DACTIVOS

- `supabase/migrations/20261013000000_initial_schema.sql` se reconstruyó del catálogo real de `dactivos-demo`, con 15 tablas, 2 ENUM, 104 columnas, 40 índices (incluyendo los implícitos de constraints), 82 restricciones, 42 funciones y 24 triggers.
- **Solo para un proyecto Supabase nuevo y vacío.** No ejecutar sobre `dactivos-demo`, que ya contiene datos ficticios validados.
- Ejecutar la migración una sola vez desde SQL Editor de un proyecto nuevo para **verificación de instalación**, después configurar Auth, la Edge Function `dactivos-invite` y las variables locales documentadas.
- Después ejecutar `supabase/VERIFY-CLEAN-INSTALL.sql` y validar el inicio de sesión y las principales operaciones. No incluye ni exporta cuentas ni datos ficticios del proyecto original.
- Crear un usuario en Supabase Auth y asignarle el perfil ADMIN mediante SQL privilegiado **adaptando el UUID de la nueva instalación**:

```sql
-- Sustituir el UUID únicamente con el de la nueva cuenta creada en Auth.
INSERT INTO public.profiles (user_id, role, is_active)
VALUES ('REEMPLAZAR_UUID_DEL_NUEVO_USUARIO'::uuid, 'ADMIN'::public.app_role, true);
```

- No insertar un UUID inventado; debe existir en `auth.users` y la cuenta debe tener correo confirmado.
- **Estado:** migración reconstruida y revisada estructuralmente. Falta ejecutar en Supabase limpio y verificar RPC. Una comprobación estática no garantiza la instalación completa.
- Supabase incluye objetos gestionados y privilegios preexistentes que pueden variar según versión; `VERIFY-CLEAN-INSTALL.sql` comprueba los objetos propios del proyecto.
