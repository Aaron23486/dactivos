"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ShieldCheck,
  Cpu,
  CircleDot,
} from "lucide-react";
import { navigation } from "@/lib/navigation";
import type { AppRole } from "@/lib/auth/permissions";
import { SignOutButton } from "@/components/layout/sign-out-button";

type NavigationLinksProps = {
  role: AppRole;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
};

const groups: { label: string; hrefs: readonly string[] }[] = [
  { label: "Vista general", hrefs: ["/dashboard"] },
  {
    label: "Operaciones",
    hrefs: ["/activos", "/empleados", "/departamentos", "/asignaciones", "/mantenimiento"],
  },
  { label: "Análisis", hrefs: ["/historial", "/reportes"] },
  { label: "Administración", hrefs: ["/usuarios", "/configuracion"] },
];

function NavigationLinks({ role, pathname, collapsed = false, onNavigate }: NavigationLinksProps) {
  // Restricción visual complementaria; la autorización real continúa en SSR/RPC.
  const visible = navigation.filter(
    (item) => !["/configuracion", "/usuarios", "/reportes"].includes(item.href) || role === "ADMIN",
  );
  return (
    <nav aria-label="Navegación principal" className="space-y-5">
      {groups.map((group) => {
        const entries = visible.filter((item) => group.hrefs.includes(item.href));
        if (entries.length === 0) return null;
        return (
          <section key={group.label} aria-label={group.label} className="space-y-1.5">
            {collapsed ? (
              <div aria-hidden="true" className="mx-3 mb-3 border-t border-sidebar-border" />
            ) : (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.19em] text-slate-400/90">
                {group.label}
              </p>
            )}
            {entries.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={[
                    "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium",
                    "transition-[background,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                    active
                      ? "bg-cyan-400/12 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,.25)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-cyan-400"
                    />
                  )}
                  <Icon
                    className={[
                      "size-[18px] shrink-0 transition-colors",
                      active ? "text-cyan-300" : "text-slate-400 group-hover:text-cyan-300",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className={collapsed ? "md:sr-only" : "truncate"}>{item.label}</span>
                  {!collapsed && active && (
                    <CircleDot aria-hidden="true" className="ml-auto size-3 text-cyan-300/75" />
                  )}
                </Link>
              );
            })}
          </section>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, role }: { children: React.ReactNode; role: AppRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current =
    navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      ?.label ?? "Dactivos";

  return (
    <div className="industrial-shell min-h-dvh text-foreground">
      <div className="flex min-h-dvh">
        <aside
          aria-label="Menú lateral"
          className={[
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex",
            "transition-[width] duration-200",
            collapsed ? "w-[76px]" : "w-[250px]",
          ].join(" ")}
        >
          <div
            className={
              collapsed
                ? "mb-7 flex flex-col items-center gap-2 px-1"
                : "mb-7 flex min-h-12 items-center justify-between gap-2 px-2"
            }
          >
            <Link
              href="/dashboard"
              title="Ir al Dashboard"
              aria-label="DACTIVOS - Ir al Dashboard"
              className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <span className="industrial-icon-frame size-10 shrink-0">
                <Boxes className="size-5" aria-hidden="true" />
              </span>
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold tracking-[.11em] text-white">
                    DACTIVOS
                  </span>
                  <span className="block text-[10px] font-medium tracking-[.13em] text-slate-400">
                    ASSET OPERATIONS
                  </span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
              aria-expanded={!collapsed}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-5">
            <NavigationLinks role={role} pathname={pathname} collapsed={collapsed} />
          </div>
          <div className="mt-3 border-t border-sidebar-border pt-3">
            <SignOutButton collapsed={collapsed} />
            <div
              className={[
                "mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border bg-white/[.025] py-2.5 text-[11px] text-slate-400",
                collapsed ? "justify-center px-1" : "px-3",
              ].join(" ")}
            >
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-cyan-400" />
              {!collapsed && <span>Sesión {role === "ADMIN" ? "Administrador" : "Seguridad"}</span>}
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú lateral"
            />
            <aside
              className="relative flex h-full w-72 max-w-[88vw] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 shadow-2xl"
              aria-label="Menú móvil"
            >
              <div className="mb-7 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-white">
                  <span className="industrial-icon-frame size-9">
                    <Boxes className="size-5" />
                  </span>{" "}
                  DACTIVOS
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                  className="rounded-lg p-2 text-slate-300 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavigationLinks
                  role={role}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <div className="mt-4 border-t border-sidebar-border pt-3">
                <SignOutButton />
              </div>
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
                className="rounded-lg p-2 text-slate-200 hover:bg-accent md:hidden"
              >
                <Menu className="size-5" />
              </button>
              <div className="hidden size-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 sm:inline-flex">
                <Cpu className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground sm:block">
                  Centro de operaciones / DACTIVOS
                </p>
                <p className="truncate text-sm font-semibold text-white">{current}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-3 py-1.5 text-[11px] font-semibold text-amber-300 sm:inline-flex">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" /> DEMO
                LOCAL
              </span>
              <span className="rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                {role === "ADMIN" ? "ADMIN" : "SECURITY"}
              </span>
            </div>
          </header>
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 md:px-7 md:py-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1480px]">{children}</div>
          </main>
          <footer className="border-t border-border/50 px-4 py-3 text-right text-[11px] text-muted-foreground md:px-10">
            DACTIVOS · Demo de gestión de activos
          </footer>
        </div>
      </div>
    </div>
  );
}
