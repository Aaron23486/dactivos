import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { Asset, Assignment, Employee, MaintenanceCase } from "@/lib/operations/contracts";
import { dateTime } from "@/lib/operations/contracts";
import { PageHeader } from "@/components/operations/primitives";
import { summarizeDashboard, type DashboardActivity } from "@/lib/dashboard/summary";

type Props = {
  assets: Asset[] | null;
  assignments: Assignment[] | null;
  cases: MaintenanceCase[] | null;
  employees: Employee[] | null;
  errors: {
    assets: string | null;
    assignments: string | null;
    cases: string | null;
    employees: string | null;
  };
};

function Count({ value }: { value: number | null }) {
  return <>{value === null ? "—" : new Intl.NumberFormat("es-CR").format(value)}</>;
}

function Bar({ label, value, total, className }: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={total || 1}
        aria-valuenow={value} className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: DashboardActivity["kind"] }) {
  switch (kind) {
    case "assignment": return <ArrowLeftRight aria-hidden="true" className="size-4" />;
    case "return": return <PackageCheck aria-hidden="true" className="size-4" />;
    case "maintenance": return <AlertTriangle aria-hidden="true" className="size-4" />;
    case "resolution": return <CheckCircle2 aria-hidden="true" className="size-4" />;
  }
}

export function DashboardOverview({ assets, assignments, cases, employees, errors }: Props) {
  const summary = summarizeDashboard({ assets, assignments, cases, employees });
  const readFailures = Object.entries(errors).filter(([, error]) => error !== null);
  const tiles = [
    { label: "Activos visibles", value: summary.total, icon: Package, href: "/activos", tone: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
    { label: "Disponibles", value: summary.available, icon: PackageCheck, href: "/activos", tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    { label: "Asignados", value: summary.assigned, icon: ArrowLeftRight, href: "/asignaciones", tone: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
    { label: "En mantenimiento", value: summary.maintenance, icon: Wrench, href: "/mantenimiento", tone: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  ] as const;

  return (
    <main className="space-y-6">
      <PageHeader eyebrow="Resumen de operaciones" title="Dashboard"
        description="Estado actual de los equipos y movimientos disponibles para tu perfil." />

      {readFailures.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold">Algunos indicadores no están disponibles.</p>
          <p className="mt-1 text-muted-foreground">
            Fallaron {readFailures.length} de las 4 consultas. Mostramos «—» donde no se pudo obtener información;
            revisa la conexión o la configuración de las RPC. No se interpretan errores como cero registros.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className="industrial-metric group rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-cyan-400/35 focus-visible:outline-2 focus-visible:outline-cyan-400">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className={`inline-flex size-10 items-center justify-center rounded-xl border ${tone}`}><Icon aria-hidden="true" className="size-5" /></span>
            </div>
            <p className="industrial-number mt-5 text-[34px] font-extrabold text-white"><Count value={value}/></p>
            <p className="industrial-soft-link mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
              Ver detalle <ArrowUpRight aria-hidden="true" className="size-3" />
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="industrial-panel rounded-xl p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <Activity aria-hidden="true" className="size-5 text-cyan-300" />
            <h2 className="font-semibold">Distribución de activos</h2>
          </div>
          {assets === null ? (
            <p className="text-sm text-muted-foreground">No se pudo consultar el inventario.</p>
          ) : (
            <div className="space-y-5">
              <Bar label="Disponibles" value={summary.available ?? 0} total={summary.total ?? 0} className="bg-emerald-400" />
              <Bar label="Asignados" value={summary.assigned ?? 0} total={summary.total ?? 0} className="bg-cyan-400" />
              <Bar label="Mantenimiento" value={summary.maintenance ?? 0} total={summary.total ?? 0} className="bg-amber-400" />
              <Bar label="Retirados" value={summary.retired ?? 0} total={summary.total ?? 0} className="bg-slate-400" />
              {(summary.unknownStatuses ?? 0) > 0 && (
                <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
                  {summary.unknownStatuses} activos tienen un estado no reconocido por este panel.
                </p>
              )}
              {assets.length === 0 && <p className="text-sm text-muted-foreground">No hay activos visibles.</p>}
            </div>
          )}
        </section>

        <section className="industrial-panel rounded-xl p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <AlertTriangle aria-hidden="true" className="size-5 text-cyan-300" />
            <h2 className="font-semibold">Atención requerida</h2>
          </div>
          <div className="space-y-3">
            <Link href="/mantenimiento" className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/35 p-4 transition-colors hover:border-cyan-400/30 hover:bg-accent/40">
              <div>
                <p className="text-sm font-medium">Incidencias abiertas</p>
                <p className="mt-1 text-xs text-muted-foreground">Requieren seguimiento técnico</p>
              </div>
              <span className="industrial-number text-2xl font-bold text-white"><Count value={summary.openCases} /></span>
            </Link>
            <Link href="/mantenimiento" className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/35 p-4 transition-colors hover:border-cyan-400/30 hover:bg-accent/40">
              <div>
                <p className="text-sm font-medium">Pendientes de liberación</p>
                <p className="mt-1 text-xs text-muted-foreground">Casos resueltos y activos pendientes de revisión física</p>
              </div>
              <span className="industrial-number text-2xl font-bold text-white"><Count value={summary.pendingRelease} /></span>
            </Link>
            <Link href="/empleados" className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/35 p-4 transition-colors hover:border-cyan-400/30 hover:bg-accent/40">
              <div>
                <p className="text-sm font-medium">Empleados activos</p>
                <p className="mt-1 text-xs text-muted-foreground">Personas habilitadas en el directorio visible</p>
              </div>
              <span className="industrial-number inline-flex items-center gap-2 text-2xl font-bold text-white">
                <Users aria-hidden="true" className="size-4 text-muted-foreground" />
                <Count value={summary.activeEmployees} />
              </span>
            </Link>
          </div>
        </section>
      </div>

      <section className="industrial-panel rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-5 text-cyan-300" />
            <h2 className="font-semibold">Movimientos recientes</h2>
          </div>
          <Link className="industrial-soft-link text-sm font-semibold underline-offset-4 hover:underline" href="/asignaciones">
            Ver entregas y devoluciones
          </Link>
        </div>
        {summary.recent === null ? (
          <p className="mt-5 text-sm text-muted-foreground">No se pudieron consultar los movimientos ni los casos de mantenimiento.</p>
        ) : summary.recent.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">Aún no hay movimientos con fechas válidas en los registros visibles.</p>
        ) : (
          <ol className="mt-5 divide-y">
            {summary.recent.map(event => (
              <li key={event.id} className="flex items-start gap-3 py-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <ActivityIcon kind={event.kind} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{event.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{dateTime(event.at)}</p>
                  <Link href={event.href} className="industrial-soft-link mt-1 inline-block text-xs underline-offset-4 hover:underline">Ver registro</Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          Indicadores calculados con registros visibles según los permisos del usuario.
          La actividad combina entregas, devoluciones y casos; no sustituye la bitácora de auditoría.
          {summary.limitedData && " Algunas consultas alcanzaron su límite de 500 filas: los conteos y movimientos podrían ser parciales."}
        </p>
      </div>
    </main>
  );
}
