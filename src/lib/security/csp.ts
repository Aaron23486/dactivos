/**
 * Content Security Policy con nonce por solicitud (NFR-1, D14). El proxy genera un nonce nuevo en
 * cada solicitud, lo pone en esta política y en la cabecera de la solicitud, y Next.js lo agrega a
 * sus propios scripts. Un script inyectado no conoce el nonce y el navegador no lo ejecuta.
 */
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function contentSecurityPolicy(
  nonce: string,
  isDev: boolean = process.env.NODE_ENV === "development",
): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic': los scripts con nonce pueden cargar los fragmentos de Next; nada más.
    // React solo necesita eval en desarrollo, para reconstruir errores del servidor.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Atributos style (anchos de barras, posición de diálogos): no ejecutan código.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // El navegador solo habla con esta app: a Supabase se le llama desde el servidor.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
