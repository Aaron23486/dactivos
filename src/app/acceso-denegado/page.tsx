import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden="true" />

        <h1 className="text-2xl font-bold">Acceso denegado</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Tu cuenta no tiene un rol activo o no dispone de permisos para acceder a este recurso.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}
