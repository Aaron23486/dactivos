import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadAuditEvents } from "@/lib/history/server-data";
import { HistoryBoard } from "@/components/history/history-board";

type HistorySearchParams = Promise<{ page?: string | string[] }>;

type HistoryPageProps = {
  searchParams: HistorySearchParams;
};

async function HistoryContent({ searchParams }: HistoryPageProps) {
  // En Next.js 16 los datos de URL se leen dentro de Suspense.
  await connection();
  await requirePermission("history.read");

  const params = await searchParams;
  const requested = typeof params.page === "string" ? Number(params.page) : NaN;
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 100
    ? requested
    : 1;
  const offset = (page - 1) * 100;

  const result = await loadAuditEvents(offset);
  return <HistoryBoard events={result.items} error={result.error} offset={offset} />;
}

export default function Page({ searchParams }: HistoryPageProps) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Consultando auditoría...
        </p>
      }
    >
      <HistoryContent searchParams={searchParams} />
    </Suspense>
  );
}
