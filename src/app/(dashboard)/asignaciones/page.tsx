import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadAssets, loadEmployees, loadAssignments } from "@/lib/operations/server-data";
import { AssignmentsBoard } from "@/components/assignments/assignments-board";
async function AssignmentsPage() {
  await connection();
  await requirePermission("assignments.read");
  const [assets, employees, assignments] = await Promise.all([
    loadAssets(),
    loadEmployees(),
    loadAssignments(),
  ]);
  return (
    <AssignmentsBoard
      assets={assets.items}
      employees={employees.items}
      assignments={assignments.items}
      errors={{ assets: assets.error, employees: employees.error, assignments: assignments.error }}
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
      <AssignmentsPage />
    </Suspense>
  );
}
