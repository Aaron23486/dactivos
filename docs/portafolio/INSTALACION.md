# Instalación y configuración

**Estado actual: pendiente de migración integral del esquema.** Esta guía no debe prometer una instalación desde cero hasta que el catálogo de la base existente se transforme en migraciones, se comprueben sus dependencias y se valide una base nueva.

## 1. Requisitos

- Node.js 20.9 o superior; npm.
- Cuenta/proyecto propio de Supabase.
- Entorno local para ejecutar Next.js. **No hace falta Docker**.

## 2. Aplicación

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
# Edita solo NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm.cmd run dev
```

El proyecto requiere las dos variables **públicas** de `.env.local`. No coloques `SUPABASE_SERVICE_ROLE_KEY` en Next.js, variables `NEXT_PUBLIC_` o el repositorio.

## 3. Base de datos (pendiente)

Los archivos actuales `sql/07B1_INSTALAR_RPC_SOLO_LECTURA.sql`, `sql/07B2_INSTALAR_RPC_ADMIN_ACCESO.sql` y `sql/07_FINAL_INSTALL.sql` son **ampliaciones**, no una instalación inicial completa. Su ejecución en un Supabase vacío fallará por dependencias faltantes. No ejecutarlos como instalador integral.

Para reconstruir las migraciones a partir de la base existente, ejecutar en **SQL Editor (solo lectura)** `supabase/catalogo/EXPORTAR_CATALOGO_09C_SOLO_LECTURA.sql`, revisar su salida y guardar el resultado como JSON fuera del repositorio. No contiene registros operativos, pero **sí definiciones de funciones y políticas que deben revisarse antes de compartir**.

Cuando se hayan generado y validado todas las migraciones, se documentará aquí el orden exacto, los scripts de creación de categorías y el bootstrap del primer ADMIN. Nunca se debe introducir un ADMIN inicial mediante contraseñas o UUID preestablecidos en un repositorio público.

## 4. Invitaciones (cuando esté instalado el esquema)

Desplegar `supabase/functions/dactivos-invite` en **el proyecto propio** con verificación de JWT activada. La Edge Function requiere las variables administradas por Supabase `SUPABASE_URL`, `SUPABASE_ANON_KEY` (o pública equivalente) y `SUPABASE_SERVICE_ROLE_KEY` **solo en su entorno seguro**.

Configurar la URL de redirección de Supabase Auth para la aplicación local, y crear las cuentas según el procedimiento inicial de roles cuando se documente. No se requiere SMTP personalizado para una demo local; el proveedor predeterminado puede tener límites de correo.

## 5. Verificaciones finales

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Además, verificar el acceso ADMIN/SECURITY en el navegador y una instalación **limpia en un entorno controlado**. No ejecutar pruebas que alteren los 45 activos ficticios de la base utilizada para las capturas.
