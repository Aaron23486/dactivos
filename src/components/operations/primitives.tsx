import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, children }: {
  eyebrow: string; title: string; description: string; children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border/50 pb-5">
      <div className="min-w-0">
        <p className="industrial-kicker">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-[30px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
    </header>
  );
}

export function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="industrial-metric rounded-xl p-5">
      <p className="text-[13px] font-medium text-slate-300">{label}</p>
      <p className="industrial-number mt-3 text-3xl font-bold text-white">{value}</p>
      <span aria-hidden="true" className="mt-3 block h-[2px] w-11 rounded-full bg-cyan-400/70" />
    </div>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-amber-400/35 bg-amber-400/8 p-4 text-sm text-amber-100">
      No pudimos cargar esta información. {message}
    </div>
  );
}

export const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/25";

export function Status({ value }: { value: string }) {
  const labels: Record<string,string> = {
    AVAILABLE: "Disponible", ASSIGNED: "Asignado", MAINTENANCE: "Mantenimiento",
    RETIRED: "Retirado", OPEN: "Abierto", RESOLVED: "Resuelto",
  };
  const themes: Record<string,string> = {
    AVAILABLE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    ASSIGNED: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    MAINTENANCE: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    OPEN: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    RESOLVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    RETIRED: "border-slate-500/30 bg-slate-400/10 text-slate-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${themes[value] ?? "border-border bg-muted text-muted-foreground"}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
      {labels[value] ?? value}
    </span>
  );
}
