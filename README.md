# DACTIVOS

**Gestión de activos tecnológicos, asignaciones y mantenimiento**  
**Next.js · TypeScript · React · Supabase · PostgreSQL · Tailwind CSS**

DACTIVOS es una aplicación web de gestión de activos para operaciones empresariales. Centraliza el inventario, los equipos asignados a colaboradores, las devoluciones físicas, las incidencias y el mantenimiento, con un historial de movimientos y permisos diferenciados.

> **Estado de publicación:** código y capturas preparados. La migración integral de Supabase y la prueba de instalación en una base nueva están **pendientes de completar**. El repositorio no debe anunciarse como instalación independiente hasta superar ambas comprobaciones. Las capturas corresponden a una instancia **local** con datos de demostración ficticios; no hay demo pública desplegada.

## Vista previa

![Dashboard DACTIVOS con datos ficticios](docs/screenshots/dactivos-dashboard.png)

|                          Inventario                           |                              Empleados                              |
| :-----------------------------------------------------------: | :-----------------------------------------------------------------: |
| ![Pantalla de activos](docs/screenshots/dactivos-activos.png) | ![Directorio de empleados](docs/screenshots/dactivos-empleados.png) |

|                              Asignaciones                              |                              Mantenimiento                               |
| :--------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| ![Gestión de asignaciones](docs/screenshots/dactivos-asignaciones.png) | ![Gestión de mantenimiento](docs/screenshots/dactivos-mantenimiento.png) |

## Funcionalidades

- **Dashboard operativo**: indicadores, distribución de activos, pendientes y actividad reciente.
- **Inventario**: categorías `HANDHELD` y `COMPUTER`, códigos internos, seriales y estados `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RETIRED`.
- **Personal y departamentos**: directorios y control de estado activo/inactivo.
- **Asignaciones y devoluciones**: control de entregas, inspección física y trazabilidad histórica.
- **Mantenimiento**: incidencias, resolución y liberación física de equipos.
- **Historial y reportes**: movimientos auditables y exportación CSV para administración.
- **Control de accesos**: roles `ADMIN` y `SECURITY`, permisos validados del lado del servidor y RPC de PostgreSQL.
- **Gestión de usuarios**: invitaciones administradas mediante una Supabase Edge Function.

## Arquitectura

| Capa         | Tecnología                             | Responsabilidad                                 |
| ------------ | -------------------------------------- | ----------------------------------------------- |
| Interfaz     | Next.js 16 · React 19 · Tailwind CSS 4 | Pantallas, formularios y visualizaciones        |
| Aplicación   | Next.js App Router · TypeScript        | Acciones del servidor, autorización y reportes  |
| Identidad    | Supabase Auth + SSR                    | Inicio/cierre de sesión y manejo de sesión      |
| Datos        | PostgreSQL (Supabase)                  | Tablas, RLS, validaciones y RPC transaccionales |
| Invitaciones | Supabase Edge Function                 | Creación segura de identidades con rol asignado |

Más información: [Arquitectura](docs/portafolio/ARQUITECTURA.md) · [Instalación](docs/portafolio/INSTALACION.md) · [Validaciones](docs/portafolio/VALIDACIONES.md).

## Ejecución local

**Requisitos:** Node.js 20.9+ y npm, además de un proyecto Supabase con el esquema DACTIVOS ya instalado. No se utiliza Docker.

```bash
npm ci
```

Copia `.env.example` a `.env.local` y define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de **tu** proyecto.

```bash
npm run dev
```

Abre <http://localhost:3000>. Para configurar el primer ADMIN, migraciones y Edge Function, consulta [Instalación](docs/portafolio/INSTALACION.md). **Aún falta completar el instalador SQL inicial:** estas instrucciones sirven para ejecutar la aplicación sobre un esquema DACTIVOS ya configurado, no para clonar la base de datos desde cero.

## Comprobaciones del repositorio

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

También puedes ejecutar `npm run check` para lanzar los cuatro comandos en secuencia.

Las capturas representan **datos ficticios** y no se incluyen cuentas, contraseñas, claves de servicio ni contenido del respaldo de Supabase. No debes publicar archivos `.env.local`, exportaciones de datos reales ni claves privilegiadas.

## Estado y alcance

Proyecto de demostración técnica orientado a portafolio profesional. No está configurado como un servicio comercial ni como una demo pública accesible en internet. Los artefactos SQL de `sql/` corresponden a **etapas incrementales** y no constituyen por sí solos una migración completa. No deben ejecutarse indiscriminadamente en una base nueva.
