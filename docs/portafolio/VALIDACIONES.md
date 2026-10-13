# Validaciones normales antes de publicar

Este checklist no reemplaza auditorías de penetración ni OWASP. Se concentra en reproducibilidad y calidad funcional.

- [x] Exportación SAFE revisada: 134/134 hashes coinciden con el origen.
- [x] Cinco imágenes PNG presentes y legibles.
- [x] Se corrigió `.gitignore` para permitir publicar `.env.example` sin exponer `.env.local`.
- [x] README con capturas, tecnologías y descripción del producto.
- [ ] Migración integral SQL verificada con el esquema real.
- [ ] Instalación desde cero verificada en instancia aislada.
- [ ] `npm ci` en Windows.
- [ ] `npm run typecheck` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npm test` sin fallos.
- [ ] `npm run build` sin errores.
- [ ] Confirmación manual de login, navegación y tablas con ADMIN/SECURITY.
- [ ] Revisión final de `git status` para descartar archivos privados.
- [ ] Publicación explícitamente autorizada por el propietario.

**Nota:** las 107 pruebas mencionadas en una ejecución anterior no se atribuyen automáticamente a esta versión; se debe repetir la batería completa tras incorporar estos archivos. `npm audit --omit=dev` había devuelto 0 alertas en una ejecución anterior, pero se debe volver a comprobar cuando se publique.
