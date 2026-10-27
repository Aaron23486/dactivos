export default function InvitationCompletePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-12">
      <section className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Contraseña configurada</h1>
        <p className="text-sm text-muted-foreground">
          Tu invitación fue aceptada y la contraseña quedó configurada. Solicita al administrador
          que active el perfil para poder utilizar DACTIVOS.
        </p>
        <a
          href="/login"
          className="inline-block rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ir a iniciar sesión
        </a>
      </section>
    </main>
  );
}
