# DACTIVOS — Épica 07: Inventario real y orden de implementación

## Evidencia de código inspeccionado (paquetes SAFE/05E + FIX1)

- **Funcionalidad operativa implementada:** pantallas de activos, empleados, departamentos, asignaciones y mantenimiento; navegación y autenticación ADMIN/SECURITY. Hay server actions para crear/editar activos, crear/editar empleados, crear/editar/activar departamentos, entregar/devolver activos, resolver casos y liberar equipos.
- **Dashboard anterior:** `src/app/(dashboard)/dashboard/page.tsx` contenía números «—», «Pendiente de conexión» y actividades ficticias. 07A lo conecta a las RPC de consulta ya instaladas.
- **Configuración:** `src/app/(dashboard)/configuracion/page.tsx` contiene «Módulo en preparación». No se ha implementado la gestión real de usuarios desde UI ni opciones administrativas.
- **Auditoría:** triggers y tablas de auditoría existen en PostgreSQL, pero no hay módulo dedicado de consulta de la bitácora a través de RPC segura e interfaz.
- **Reportes:** `reports.export` figura en la matriz RBAC para ADMIN, pero no existe flujo real de generación/exportación ni pantalla dedicada.
- **Baja/reactivación:** permisos `assets.retire`/`assets.reactivate` existen para ADMIN, pero no figuran como server actions ni controles en las pantallas revisadas.
- **Incidencias durante asignación:** mantenimiento por devolución dañada sí está implementado; no se encontró pantalla para registrar incidencia independiente antes de recibir físicamente el equipo.
- **Categorías:** se consultan; no hay módulo de administración de categorías, y los requisitos originales permiten solo categorías HANDHELD/COMPUTER.
- **Clonación/migraciones:** no se incluyó esquema completo de Supabase en los paquetes SAFE. Este pendiente no implica crear otra base o publicar GitHub: sólo documentar el estado local cuando sea oportuno.

## Orden recomendado después de 07A

1. **07B Usuarios/seguridad:** control de acceso y usuarios administrado por ADMIN, solo tras verificar backend RPC/funciones Auth disponibles. No exponer service-role al navegador.
2. **07C Auditoría y reportes:** consulta histórica segura con paginación, búsquedas y exportación exclusivamente ADMIN; SECURITY puede consultar solo historial operativo permitido.
3. **07D Incidencias complementarias y bajas:** completar reporte de daños de activos asignados, bajas/reactivación auditadas y correcciones administrativas sin borrar historia.
4. **07E Configuración:** funciones administrativas concretas, evitando controles decorativos; pruebas end-to-end y revisión final.

## 07A — Alcance

- No crea tablas, triggers, RPC ni usuarios; no modifica Supabase.
- No cambia permisos existentes, login ni navegación.
- Consulta cuatro RPC ya existentes y protegidas: `dactivos_list_assets`, `dactivos_list_assignments`, `dactivos_list_maintenance_cases`, `dactivos_list_employees`.
- Totales calculados **sobre filas visibles**, sin fingir totales globales si la lista está limitada a 500.
- Ante error de una RPC, muestra «—» para el indicador afectado; jamás presenta 0 como valor inferido.
- Timeline deriva de fechas reales de entregas/devoluciones/incidencias; no presenta auditoría formal ni actor detallado.
- **Sincronización:** refrescar vista del navegador para solicitar una nueva lectura tras operaciones. No se agregan suscripciones en tiempo real.
- Los conteos de mantenimiento/liberación reproducen condiciones visibles; la autorización final siempre se aplica en PostgreSQL.

## Limitaciones pendientes fuera de 07A

- Comprobación experimental de dos asignaciones concurrentes reales sigue pendiente (sin modificar los registros existentes).
- 06B-2 omitió pruebas de filtrado de activos RETIRED y departamentos inactivos por falta de datos.
- 06B-4 no inspeccionó contadores completos de todas las tablas de auditoría; no reportarlo como aprobado.
- RLS, RPC y triggers revisados previamente conservan su estado; 07A no toca el esquema.
