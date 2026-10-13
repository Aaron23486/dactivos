import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadDepartments, loadEmployees } from "@/lib/operations/server-data";
import { DepartmentsBoard } from "@/components/departments/departments-board";

async function DepartmentsPage() {
  await connection();
  const {role} = await requirePermission("departments.read");
  const [departments, employees] = await Promise.all([loadDepartments(), loadEmployees()]);
  return <DepartmentsBoard role={role} departments={departments.items}
    employees={employees.error ? null : employees.items} error={departments.error}/>;
}
export default function Page() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Cargando departamentos...</p>}><DepartmentsPage/></Suspense>;
}
