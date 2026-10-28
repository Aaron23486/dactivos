import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");

test("Eventos: el login registra fallos y bloqueos sin la contraseña ni el correo en claro (NFR-1, D13)", () => {
  const login = read("src/app/(auth)/login/actions.ts");
  assert.match(login, /logSecurityEvent\("auth\.sign_in_throttled", \{ email: emailFingerprint\(/);
  assert.match(login, /logSecurityEvent\("auth\.sign_in_failed", \{ email: emailFingerprint\(/);
  assert.doesNotMatch(login, /logSecurityEvent\([^)]*password/);
});

test("Eventos: los accesos denegados y las invitaciones rechazadas quedan registrados (NFR-1, D13)", () => {
  const permission = read("src/lib/auth/require-permission.ts");
  assert.equal((permission.match(/logSecurityEvent\("auth\.access_denied"/g) ?? []).length, 2);
  assert.match(read("src/app/(auth)/aceptar-invitacion/actions.ts"), /auth\.invitation_rejected/);
  assert.match(
    read("src/app/(auth)/establecer-contrasena/actions.ts"),
    /auth\.invitation_rejected/,
  );
});

test("Exportación: el archivo solo se entrega después de registrarla (FR-10, D13)", () => {
  const route = read("src/app/api/reportes/route.ts");
  const audit = route.indexOf('rpc("dactivos_admin_log_report_export"');
  assert.ok(audit > 0);
  assert.ok(audit < route.indexOf("new Response(makeCSV("), "la auditoría va antes del archivo");
  assert.match(route, /if \(auditError\) \{[\s\S]*status: 503/);
});
