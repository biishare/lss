import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";

type IntegrationCheck =
  | { status: "connected"; value: string | null }
  | { status: "unconfigured" | "api-unavailable" | "database-unavailable" | "invalid-record" };

export async function loadIntegrationCheck(): Promise<IntegrationCheck> {
  const baseUrl = process.env.LSS_API_BASE_URL?.trim();
  if (!baseUrl || !URL.canParse(baseUrl)) return { status: "unconfigured" };

  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && base.protocol !== "http:") {
    return { status: "unconfigured" };
  }

  try {
    const headers = new Headers({ Accept: "application/json" });
    if (
      process.env.VERCEL_ENV === "preview" &&
      base.protocol === "https:" &&
      base.hostname.endsWith(".vercel.app")
    ) {
      const token = await getVercelOidcToken();
      if (token) headers.set("x-vercel-trusted-oidc-idp-token", token);
    }

    const response = await fetch(new URL("/api/v1/integration-check", base), {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return { status: "api-unavailable" };

    if ("code" in data) {
      if (response.status === 503 && data.code === "DATABASE_UNAVAILABLE") {
        return { status: "database-unavailable" };
      }
      if (response.status === 422 && data.code === "INVALID_CHECK_RECORD") {
        return { status: "invalid-record" };
      }
    }

    if (response.ok && "value" in data && (data.value === null || typeof data.value === "string")) {
      return { status: "connected", value: data.value };
    }
  } catch {
    return { status: "api-unavailable" };
  }

  return { status: "api-unavailable" };
}
