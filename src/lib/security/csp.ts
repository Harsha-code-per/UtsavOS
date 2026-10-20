/**
 * Builds the Content-Security-Policy header for page requests.
 *
 * Scripts and styles are allowed only by per-request nonce ('strict-dynamic'
 * lets Firebase Auth load its helper scripts). No 'unsafe-inline' in production.
 */
export function buildCsp(nonce: string, opts: { isDev: boolean; authDomain?: string }): string {
  const { isDev, authDomain } = opts;
  const authFrame = authDomain ? ` https://${authDomain}` : "";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data: https://lh3.googleusercontent.com",
    "font-src 'self'",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
    `frame-src https://accounts.google.com https://apis.google.com${authFrame}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
