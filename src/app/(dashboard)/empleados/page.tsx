import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadEmployees, loadDepartments, loadAssignments } from "@/lib/operations/server-data";
import { EmployeesBoard } from "@/components/employees/employees-board";

async function EmployeesPage() {
  await connection();
  const { role } = await requirePermission("employees.read");
  const [employees, departments, assignments] = await Promise.all([
    loadEmployees(),
    loadDepartments(),
    loadAssignments(),
  ]);
  return (
    <EmployeesBoard
      role={role}
      employees={employees.items}
      departments={departments.items}
      assignments={assignments.error ? null : assignments.items}
      error={employees.error || departments.error}
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
      <EmployeesPage />
    </Suspense>
  );
}
