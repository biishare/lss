import { decode, isSchoolActor, type Actor } from "../../features/central/client";
import {
  allowsSchoolRoute, demoMode, sessionCookies, takeSessionCookies, trustedSchoolOrigin, upstream,
} from "../../features/central/upstream";

const logoPath = "/api/v1/institution/logo";
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const sessionWriters = new Set(["/api/auth/sign-in/email", "/api/auth/sign-out", "/api/v1/me/password"]);

function problem(status: number, code: string, message: string) {
  return Response.json({ code, message, requestId: crypto.randomUUID() }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

async function limitedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function forward(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await context.params;
  const path = "/api/" + segments.map(encodeURIComponent).join("/");
  const method = request.method;
  if (demoMode() || segments.some((segment) => segment === "." || segment === ".." || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(segment)) || !allowsSchoolRoute(method, path)) {
    return problem(404, "NOT_FOUND", "A operação não está disponível.");
  }

  const outgoing = new Headers({ Accept: "application/json" });
  const session = takeSessionCookies(request.headers.get("cookie"));
  if (session) outgoing.set("Cookie", session);
  const search = new URL(request.url).search;
  if (search.length > 2048) return problem(422, "INVALID_DATA", "Os filtros excedem o limite permitido.");

  try {
    let body: Awaited<ReturnType<typeof limitedBody>> | undefined;
    if (method !== "GET") {
      const source = request.headers.get("origin");
      if (!source || !trustedSchoolOrigin(source)) return problem(403, "FORBIDDEN", "A origem do pedido não está autorizada.");
      outgoing.set("Origin", source);
      const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (path === logoPath ? !type || !imageTypes.has(type) : type !== "application/json") {
        return problem(415, "UNSUPPORTED_MEDIA_TYPE", "Indique um formato de ficheiro ou dados válido.");
      }
      if (type) outgoing.set("Content-Type", type);
      const command = request.headers.get("Idempotency-Key");
      if (command) outgoing.set("Idempotency-Key", command);
      const revision = request.headers.get("X-Institution-Revision");
      if (path === logoPath && revision) outgoing.set("X-Institution-Revision", revision);
      body = await limitedBody(request, path === logoPath ? 2 * 1024 * 1024 : 16 * 1024);
      if (!body) return problem(413, "PAYLOAD_TOO_LARGE", "O pedido excede o limite permitido.");
    }

    // Identity of the institution and own-password endpoints are shared with lss-admin.
    if (path === "/api/v1/institution" || path === logoPath || path === "/api/v1/me/password") {
      const identity = await upstream("/api/v1/me", { headers: outgoing, signal: request.signal });
      if (!identity.headers.get("content-type")?.includes("application/json")) {
        await identity.body?.cancel();
        return problem(503, "API_UNAVAILABLE", "Não foi possível verificar a sessão.");
      }
      if (!identity.ok) return new Response(identity.body, {
        status: identity.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
      });
      if (!isSchoolActor(await decode<Actor>(identity))) return problem(403, "FORBIDDEN", "Esta área destina-se às contas escolares.");
    }
    const response = await upstream(path + search, { method, headers: outgoing, body, signal: request.signal });
    const contentType = response.headers.get("content-type") ?? "";
    const csv = method === "GET" && path.startsWith("/api/v1/reports/") && contentType.includes("text/csv");
    if (response.status !== 204 && !contentType.includes("application/json") && !csv) {
      await response.body?.cancel();
      return problem(503, "API_UNAVAILABLE", "Não foi possível comunicar com o LSS. Tente novamente.");
    }
    const incoming = new Headers({ "Cache-Control": "private, no-store" });
    for (const key of ["content-type", "retry-after", "x-request-id", "x-total-count", "x-report-page"]) {
      const value = response.headers.get(key);
      if (value) incoming.set(key, value);
    }
    if (csv) incoming.set("Content-Disposition", "attachment");
    if (response.ok && sessionWriters.has(path)) {
      for (const cookie of sessionCookies(response.headers)) incoming.append("Set-Cookie", cookie);
    }
    return new Response(response.body, { status: response.status, headers: incoming });
  } catch {
    return problem(503, "API_UNAVAILABLE", "Não foi possível comunicar com o LSS. Tente novamente.");
  }
}

export { forward as GET, forward as POST, forward as PATCH };
