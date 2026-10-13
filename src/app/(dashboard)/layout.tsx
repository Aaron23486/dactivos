import { Suspense } from "react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/require-permission";

async function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  // La autenticacion usa datos de la solicitud; no prerenderizar este arbol.
  await connection();
  const { role } = await requirePermission("dashboard.read");

  return <AppShell role={role}>{children}</AppShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground"
        >
          Verificando permisos...
        </div>
      }
    >
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}

