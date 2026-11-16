import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { schoolRoutes } from "./school-routes";

const cookieNames = ["__Secure-lss.session_token", "lss.session_token"];
const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const routeMatchers = schoolRoutes.map(([method, path]) => ({
  method,
  route: new RegExp("^" + path.replace(/\{[^}]+\}/g, "[a-zA-Z0-9_.:%-]{1,384}") + "$"),
}));

export const demoMode = () => process.env.LSS_DATA_MODE === "demo";

function origin(value: string | undefined) {
  try {
    const url = new URL(value?.trim() ?? "");
    const local = process.env.VERCEL !== "1" && url.protocol === "http:" && localHosts.has(url.hostname);
    if ((url.protocol === "https:" || local) && url.pathname === "/" && !url.search &&
      !url.hash && !url.username && !url.password) return url;
  } catch { /* The caller reports configuration as unavailable. */ }
}

export function trustedSchoolOrigin(value: string | null) {
  return value !== null && (process.env.LSS_SCHOOL_ORIGINS ?? "").split(",").some((item) => origin(item)?.origin === value);
}

export function allowsSchoolRoute(method: string, path: string) {
  return routeMatchers.some((rule) => rule.method === method && rule.route.test(path));
}

export function takeSessionCookies(cookie: string | null) {
  return cookie?.split(";").map((part) => part.trim()).filter((part) =>
    !/[\r\n]/.test(part) && cookieNames.some((name) => part.startsWith(name + "="))
  ).join("; ") ?? "";
}

export function sessionCookies(headers: Headers) {
  return headers.getSetCookie().filter((line) => cookieNames.some((name) => line.startsWith(name + "=")) &&
    /(?:^|;\s*)HttpOnly(?:;|$)/i.test(line) && !/(?:^|;\s*)Domain=/i.test(line));
}

export async function upstream(path: string, options: RequestInit = {}) {
  const api = origin(process.env.LSS_API_ORIGIN);
  if (!api || (!path.startsWith("/api/") && path !== "/health/ready")) throw new Error("API indisponível.");
  const url = new URL(path, api);
  if (url.origin !== api.origin) throw new Error("Origem inválida.");
  const headers = new Headers(options.headers);
  if (process.env.VERCEL_ENV === "preview" && api.hostname.endsWith(".vercel.app")) {
    const token = await getVercelOidcToken();
    if (token) headers.set("x-vercel-trusted-oidc-idp-token", token);
  }
  const timeout = AbortSignal.timeout(12_000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  return fetch(url, { ...options, headers, cache: "no-store", redirect: "error", signal });
}
