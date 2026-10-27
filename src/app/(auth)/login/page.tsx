import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Boxes, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signIn } from "./actions";

type LoginProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

async function LoginContent({ searchParams }: LoginProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage =
    params.error === "credentials"
      ? "No fue posible iniciar sesión. Verifica tus credenciales e inténtalo nuevamente."
      : params.error === "throttled"
        ? "Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo nuevamente."
        : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_45px_-22px_rgba(6,182,212,.65)]">
            <Boxes className="size-7" aria-hidden="true" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">DACTIVOS</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Gestión y control de activos tecnológicos
          </p>
        </div>

        <section className="industrial-panel rounded-2xl p-7 sm:p-8">
          <div className="mb-7">
            <div className="mb-2 flex items-center gap-2">
              <LockKeyhole className="size-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Iniciar sesión</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Accede con las credenciales autorizadas.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          )}

          <form action={signIn} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                placeholder="correo@empresa.com"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
              />
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Ingresar a Dactivos
            </button>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Acceso exclusivo para personal autorizado
        </div>
      </div>
    </main>
  );
}

export default function LoginPage(props: LoginProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
          <p role="status" className="text-sm text-muted-foreground">
            Preparando acceso seguro...
          </p>
        </main>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}
