import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { ReportsBoard } from "@/components/reports/reports-board";
async function Content() {
  await connection();
  await requirePermission("reports.export");
  return <ReportsBoard />;
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="p-6" role="status">
          Verificando permisos...
        </p>
      }
    >
      <Content />
    </Suspense>
  );
}
