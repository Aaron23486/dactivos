import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  loadAssets,
  loadCategories,
  loadAssignments,
  loadMaintenance,
} from "@/lib/operations/server-data";
import { AssetsInventory } from "@/components/assets/assets-inventory";

async function AssetsPage() {
  await connection();
  const { role } = await requirePermission("assets.read");
  const [assets, categories, assignments, maintenance] = await Promise.all([
    loadAssets(),
    loadCategories(),
    loadAssignments(),
    loadMaintenance(),
  ]);
  return (
    <AssetsInventory
      role={role}
      assets={assets.items}
      categories={categories.items}
      assignments={assignments.error ? null : assignments.items}
      cases={maintenance.error ? null : maintenance.items}
      error={
        assets.error || categories.error
          ? "No se pudo consultar el inventario o las categorías."
          : null
      }
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
      <AssetsPage />
    </Suspense>
  );
}
