"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";

type SignOutButtonProps = {
  collapsed?: boolean;
};

export function SignOutButton({ collapsed = false }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        title={collapsed ? "Cerrar sesión" : undefined}
        aria-label="Cerrar sesión"
        className={[
          "flex min-h-11 w-full items-center gap-3 rounded-lg px-3",
          "text-sm text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-ring",
        ].join(" ")}
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />

        <span className={collapsed ? "md:sr-only" : ""}>Cerrar sesión</span>
      </button>
    </form>
  );
}
