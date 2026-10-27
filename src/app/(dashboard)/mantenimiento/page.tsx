import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadMaintenance, loadAssets, loadAssignments } from "@/lib/operations/server-data";
import { MaintenanceBoard } from "@/components/maintenance/maintenance-board";
async function MaintenancePage() {
  await connection();
  await requirePermission("maintenance.read");
  const [cases, assets, assignments] = await Promise.all([
    loadMaintenance(),
    loadAssets(),
    loadAssignments(),
  ]);
  return (
    <MaintenanceBoard
      cases={cases.items}
      assets={assets.items}
      assignments={assignments.error ? null : assignments.items}
      errors={{ cases: cases.error, assets: assets.error }}
    />
  );
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Cargando módulo...
        </p>
      }
    >
      <MaintenancePage />
    </Suspense>
  );
}
