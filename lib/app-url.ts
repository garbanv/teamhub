export function getAppBaseUrl(fallback?: string) {
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    fallback ??
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export function getAppUrl(pathname: string, fallback?: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAppBaseUrl(fallback)}${path}`;
}
