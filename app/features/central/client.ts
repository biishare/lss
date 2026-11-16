import type { components, paths } from "./contract";

export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];
export type Actor = Schema<"Actor">;
export type SchoolActor = Actor & { role: "secretaria" | "director"; destination: "lss" };

export function isSchoolActor(actor: Actor): actor is SchoolActor {
  return actor.status === "active" && actor.destination === "lss" &&
    (actor.role === "secretaria" || actor.role === "director");
}

type Issue = Omit<Schema<"ApiError">, "code"> & { code: string };

export class SchoolApiError extends Error {
  constructor(readonly status: number, readonly issue: Issue) {
    super(issue.message);
  }
}

export const unavailable = {
  code: "API_UNAVAILABLE",
  message: "Não foi possível comunicar com o LSS. Tente novamente.",
  requestId: "",
} as const;

type RequestPath = keyof paths;
type Method = "GET" | "POST" | "PATCH";
type RouteFor<M extends Method> = {
  [P in RequestPath]: paths[P][Lowercase<M>] extends object ? P : never
}[RequestPath];
type Operation<M extends Method, P extends RouteFor<M>> = paths[P][Lowercase<M>];
type Parameters<O, K extends string> = O extends { parameters: infer T }
  ? K extends keyof T ? T[K] : never : never;
type JsonContent<T> = T extends { content: { "application/json": infer D } } ? D : never;
type Body<O> = O extends { requestBody?: infer R } ? JsonContent<NonNullable<R>> : never;
type Result<O> = O extends { responses: infer R }
  ? JsonContent<R[Extract<keyof R, 200 | 201>]> extends never ? void : JsonContent<R[Extract<keyof R, 200 | 201>]>
  : never;
type RequestOptions<O> = {
  params?: Parameters<O, "path">;
  query?: Parameters<O, "query">;
  body?: Body<O>;
  file?: File;
  revision?: number;
  key?: string;
  signal?: AbortSignal;
};

export function requestPath(path: RequestPath, params?: object, query?: object) {
  const route = path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = (params as Record<string, unknown> | undefined)?.[name];
    if (typeof value !== "string" || value === "." || value === ".." || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) {
      throw new Error("Identificador inválido.");
    }
    return encodeURIComponent(value);
  });
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "" && value !== null) search.set(name, String(value));
  }
  return search.size ? route + "?" + search.toString() : route;
}

export async function decode<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const value = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (typeof value?.code === "string" && typeof value?.message === "string") {
      throw new SchoolApiError(response.status, value);
    }
    throw new SchoolApiError(503, unavailable);
  }
  if (value === undefined) throw new SchoolApiError(503, unavailable);
  return value as T;
}

export async function apiRequest<M extends Method, P extends RouteFor<M>>(
  method: M, path: P, options: RequestOptions<Operation<M, P>> = {},
): Promise<Result<Operation<M, P>>> {
  const headers = new Headers();
  if (method !== "GET") headers.set("Content-Type", options.file?.type ?? "application/json");
  if (options.key) headers.set("Idempotency-Key", options.key);
  if (options.revision !== undefined) headers.set("X-Institution-Revision", String(options.revision));
  const response = await fetch(requestPath(path, options.params, options.query), {
    method, headers, mode: "same-origin", credentials: "same-origin", cache: "no-store", signal: options.signal,
    body: method === "GET" ? undefined : options.file ?? JSON.stringify(options.body ?? {}),
  }).catch((cause: unknown) => {
    if (options.signal?.aborted) throw cause;
    throw new SchoolApiError(503, unavailable);
  });
  return decode(response);
}

export function issueMessage(error: unknown, expire = true) {
  if (error instanceof SchoolApiError) {
    if (expire && error.issue.code === "UNAUTHENTICATED") window.location.replace("/?sessao=expirada");
    const fields = Object.values(error.issue.fieldErrors ?? {}).flat().join(" ");
    return fields ? error.message + " " + fields : error.message;
  }
  return error instanceof Error ? error.message : unavailable.message;
}
