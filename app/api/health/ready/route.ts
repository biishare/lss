import { demoMode, upstream } from "../../../features/central/upstream";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (demoMode()) return Response.json({ status: "unavailable" }, { status: 404, headers });
  try {
    const response = await upstream("/health/ready", {
      headers: { Accept: "application/json" }, signal: request.signal,
    });
    const result = await response.json();
    if (response.ok && result?.status === "ready") return Response.json({ status: "ready" }, { headers });
  } catch { /* The response contains only readiness state. */ }
  return Response.json({ status: "unavailable" }, { status: 503, headers });
}
