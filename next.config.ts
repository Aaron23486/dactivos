import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// La Content Security Policy la envía el proxy, con un nonce nuevo en cada solicitud
// (src/lib/security/csp.ts, D14). Aquí van las demás cabeceras de seguridad.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Los enlaces de invitación llevan un token en la URL: nunca enviar la URL completa a otros sitios.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Sin Cache Components ni Partial Prerendering: una estructura estática no puede llevar el nonce
  // de cada solicitud, y todas las páginas dependen de la sesión (D14).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // La página de inicio es el dashboard; redirigir aquí evita renderizar una página solo para redirigir.
  redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
