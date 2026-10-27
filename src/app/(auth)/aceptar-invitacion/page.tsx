import { Suspense } from "react";
import { connection } from "next/server";
import { acceptInvitation } from "./actions";

type Params = Promise<{
  token_hash?: string | string[];
  type?: string | string[];
}>;

async function InvitationContent({ searchParams }: { searchParams: Params }) {
  await connection();
  const params = await searchParams;
  const token = typeof params.token_hash === "string" ? params.token_hash : "";
  const valid =
    params.type === "invite" &&
    token.length >= 16 &&
    token.length <= 512 &&
    /^[A-Za-z0-9_-]+$/.test(token);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-12">
      <section className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Invitación a DACTIVOS</h1>
        {valid ? (
          <>
            <p className="text-sm text-muted-foreground">
              Recibiste una invitación para utilizar DACTIVOS. Confirma que deseas aceptarla.
              Después podrás establecer tu contraseña.
            </p>
            <form action={acceptInvitation} className="space-y-4">
              <input type="hidden" name="token_hash" value={token} />
              <input type="hidden" name="type" value="invite" />
              <button
                type="submit"
                name="confirm"
                value="yes"
                className="min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground"
              >
                Aceptar invitación
              </button>
            </form>
          </>
        ) : (
          <>
            <p role="alert" className="text-sm text-muted-foreground">
              Este enlace no es válido. Solicita a un administrador una nueva invitación.
            </p>
            <a className="text-sm underline" href="/login">
              Volver al inicio de sesión
            </a>
          </>
        )}
      </section>
    </main>
  );
}

export default function InvitationPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6">
          Validando enlace...
        </p>
      }
    >
      <InvitationContent searchParams={searchParams} />
    </Suspense>
  );
}
