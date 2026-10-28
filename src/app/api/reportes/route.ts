import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { isReportKind, makeCSV, keepDate } from "@/lib/reports/csv";
/** Exportación CSV para ADMIN, paginada y sin entregar archivos parciales (FR-10). */
export async function GET(req: NextRequest) {
  await requirePermission("reports.export");
  const params = req.nextUrl.searchParams;
  const kind = params.get("tipo") ?? "";
  if (!isReportKind(kind)) return Response.json({ error: "Reporte inválido" }, { status: 400 });
  const from = params.get("desde"),
    to = params.get("hasta");
  if (
    [from, to].some(
      (d) =>
        d !== null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + "T00:00:00Z"))),
    )
  )
    return Response.json({ error: "Fecha inválida" }, { status: 400 });
  if (from && to && from > to)
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  const supabase = await createClient();
  const results: Record<string, unknown>[] = [];
  const limit = 250,
    max = 10000;
  for (let offset = 0; offset <= max; offset += limit) {
    const { data, error } = await supabase.rpc("dactivos_admin_report_page", {
      p_kind: kind,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error(`[DACTIVOS] Exportación ${error.code ?? "unknown"}`);
      return Response.json(
        { error: "No fue posible generar el reporte. Inténtalo de nuevo más tarde." },
        { status: 503 },
      );
    }
    if (
      !Array.isArray(data) ||
      !data.every((v) => v !== null && typeof v === "object" && !Array.isArray(v))
    )
      return Response.json({ error: "Respuesta de reporte inválida" }, { status: 502 });
    if (offset === max && data.length)
      return Response.json(
        { error: "Más de 10 000 filas. Exportación detenida sin entregar archivo parcial." },
        { status: 413 },
      );
    for (const item of data) if (keepDate(item, kind, from, to)) results.push(item);
    if (data.length < limit) break;
  }
  return new Response(makeCSV(kind, results), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dactivos_${kind}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
