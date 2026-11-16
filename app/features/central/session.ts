import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { decode, isSchoolActor, type Actor, type SchoolActor } from "./client";
import { takeSessionCookies, upstream } from "./upstream";

type SessionState = { kind: "school"; actor: SchoolActor } | {
  kind: "guest" | "expired" | "refused" | "unavailable";
};

export const readSchoolSession = cache(async (): Promise<SessionState> => {
  const cookie = takeSessionCookies((await headers()).get("cookie"));
  if (!cookie) return { kind: "guest" };
  try {
    const response = await upstream("/api/v1/me", { headers: { Cookie: cookie } });
    if (response.status === 401) return { kind: "expired" };
    if (response.status === 403) return { kind: "refused" };
    const actor = await decode<Actor>(response);
    return isSchoolActor(actor) ? { kind: "school", actor } : { kind: "refused" };
  } catch {
    return { kind: "unavailable" };
  }
});
