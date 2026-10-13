# Migraciones: pendiente de instalación reproducible

**No hay una migración de base completa validada.** Los SQL históricos bajo `sql/` no contienen todo el contrato inicial.

Antes de publicar el repositorio como clonado e instalable:
1. Exportar el catálogo real con `supabase/catalogo/EXPORTAR_CATALOGO_09C_SOLO_LECTURA.sql`.
2. Reconstruir DDL de tipos, tablas, restricciones, funciones, triggers, políticas y privilegios.
3. Añadir un bootstrap seguro del primer ADMIN, sin credenciales codificadas ni perfiles públicos por defecto.
4. Probar todo en un entorno Supabase **aislado**, nunca contra `dactivos-demo`.
5. Confirmar que no hay datos personales ni credenciales en los SQL finales.
