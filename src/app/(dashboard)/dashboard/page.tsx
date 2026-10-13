import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  loadAssets,
  loadAssignments,
  loadEmployees,
  loadMaintenance,
} from "@/lib/operations/server-data";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

async function DashboardContent() {
  await connection();
  await requirePermission("dashboard.read");

  const [assets, assignments, maintenance, employees] = await Promise.all([
    loadAssets(),
    loadAssignments(),
    loadMaintenance(),
    loadEmployees(),
  ]);

  return (
    <DashboardOverview
      assets={assets.error ? null : assets.items}
      assignments={assignments.error ? null : assignments.items}
      cases={maintenance.error ? null : maintenance.items}
      employees={employees.error ? null : employees.items}
      errors={{
        assets: assets.error,
        assignments: assignments.error,
        cases: maintenance.error,
        employees: employees.error,
      }}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Consultando indicadores operativos...
        </p>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
