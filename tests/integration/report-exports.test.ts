import assert from "node:assert/strict";
import { before, test } from "node:test";
import { admin, call, createUser, ok, rows, type TestUser } from "./support.ts";

// Every CSV export leaves an append-only record that administrators see in the history.

let adminUser: TestUser;

before(async () => {
  adminUser = await createUser("ADMIN");
});

test("an export is recorded with its actor, report, range and rows, and shows in the history (FR-10, D13)", async () => {
  const logged = await ok(adminUser.client, "dactivos_admin_log_report_export", {
    p_kind: "employees",
    p_date_from: "2026-01-01",
    p_date_to: "2026-01-31",
    p_row_count: 12,
  });
  assert.equal(logged, true);

  const { data: record, error } = await admin
    .from("report_export_log")
    .select("id, actor_user_id, report_kind, date_from, date_to, row_count")
    .eq("actor_user_id", adminUser.id)
    .order("id", { ascending: false })
    .limit(1)
    .single();
  assert.equal(error, null);
  assert.equal(record!.report_kind, "employees");
  assert.equal(record!.date_from, "2026-01-01");
  assert.equal(record!.row_count, 12);

  const events = rows(
    await ok(adminUser.client, "dactivos_list_audit_events", { p_limit: 100, p_offset: 0 }),
  );
  const event = events.find((e) => e.id === `re:${record!.id}`);
  assert.ok(event, "the export appears in the history");
  assert.equal(event!.source, "REPORTE");
  assert.equal(event!.actor, adminUser.id);
});

test("the export log rejects invalid data and cannot be changed, even with the service key (R11, D13)", async () => {
  const badRange = await call(adminUser.client, "dactivos_admin_log_report_export", {
    p_kind: "assets",
    p_date_from: "2026-02-01",
    p_date_to: "2026-01-01",
    p_row_count: 1,
  });
  assert.equal(badRange.code, "22023");
  const badKind = await call(adminUser.client, "dactivos_admin_log_report_export", {
    p_kind: "salaries",
    p_date_from: null,
    p_date_to: null,
    p_row_count: 1,
  });
  assert.equal(badKind.code, "22023");

  const { data: last } = await admin
    .from("report_export_log")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  const { error: updateError } = await admin
    .from("report_export_log")
    .update({ row_count: 0 })
    .eq("id", last!.id);
  assert.ok(updateError, "the export log is append-only");
  const { error: deleteError } = await admin.from("report_export_log").delete().eq("id", last!.id);
  assert.ok(deleteError, "the export log is append-only");
});
