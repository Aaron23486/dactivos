import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";

async function AdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  await requirePermission("settings.manage");

  return <>{children}</>;
}

export default function ConfigurationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-6 text-sm text-muted-foreground">
          Verificando permisos administrativos...
        </div>
      }
    >
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
}
