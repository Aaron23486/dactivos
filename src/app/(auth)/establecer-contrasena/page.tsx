import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isFreshInvitationSession } from "@/lib/auth/invitation-session";
import { createClient } from "@/lib/supabase/server";
import { setInvitedPassword } from "./actions";

type Params = Promise<{ error?: string | string[] }>;

async function PasswordContent({ searchParams }: { searchParams: Params }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?error=invitation");
  const { data: session } = await supabase.auth.getClaims();
  if (!isFreshInvitationSession(session?.claims)) redirect("/login?error=invitation");
  const params = await searchParams;
  const invalid = params.error === "invalid";
  const failed = params.error === "update";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-12">
      <section className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Crear contraseña de acceso</h1>
        <p className="text-sm text-muted-foreground">
          Establece una contraseña de 12 a 72 caracteres que combine letras y números. Tu cuenta
          permanecerá inactiva hasta que ADMIN autorice el acceso.
        </p>
        {(invalid || failed) && (
          <p role="alert" className="text-sm text-destructive">
            {invalid
              ? "Las contraseñas deben coincidir, tener entre 12 y 72 caracteres y combinar letras y números."
              : "No fue posible actualizar la contraseña. Inténtalo de nuevo."}
          </p>
        )}
        <form action={setInvitedPassword} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Nueva contraseña
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              className="block min-h-11 w-full rounded-md border bg-background px-3"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Confirmar contraseña
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              className="block min-h-11 w-full rounded-md border bg-background px-3"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground"
          >
            Guardar contraseña
          </button>
        </form>
      </section>
    </main>
  );
}

export default function PasswordPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6">
          Comprobando invitación...
        </p>
      }
    >
      <PasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
