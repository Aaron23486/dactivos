import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadAdminUsers } from "@/lib/users/server-data";
import { AdminUsersBoard } from "@/components/users/admin-users-board";

async function AdminUsersContent() {
  await connection();
  const current = await requirePermission("users.manage");
  const result = await loadAdminUsers();
  return <AdminUsersBoard users={result.users} error={result.error} actorId={current.id} />;
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Consultando usuarios autorizados...
        </p>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
