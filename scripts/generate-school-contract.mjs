import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const contractPath = process.argv[2];
if (!contractPath) throw new Error("Indica o openapi.json de lss-api.");
const source = JSON.parse(readFileSync(contractPath, "utf8"));
const schoolPaths = Object.fromEntries(Object.entries(source.paths).filter(([path]) =>
  /^\/api\/auth\/(sign-in\/email|sign-out)$/.test(path) ||
  /^\/api\/v1\/(me|access-reset|institution|academic-years|levels|classes|rooms|groups|students|enrollments|commands|finance|cash-sessions|reports|audit)(\/|$)/.test(path),
));

// Retain only definitions reachable from the school application's routes.
const components = {};
function includeReferences(value) {
  if (!value || typeof value !== "object") return;
  const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(value.$ref ?? "");
  if (match) {
    const [, kind, name] = match;
    components[kind] ??= {};
    if (!Object.hasOwn(components[kind], name)) {
      components[kind][name] = source.components[kind][name];
      includeReferences(components[kind][name]);
    }
  }
  if (value.security?.some?.((entry) => "lssSession" in entry)) {
    components.securitySchemes ??= source.components.securitySchemes;
  }
  for (const child of Object.values(value)) includeReferences(child);
}
includeReferences(schoolPaths);

const target = new URL("../app/features/central/", import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), "lss-contract-"));
try {
  const spec = join(temporary, "school.json");
  writeFileSync(spec, JSON.stringify({ openapi: source.openapi, info: source.info, paths: schoolPaths, components }));
  execFileSync("npm", ["exec", "--yes", "--package=openapi-typescript@7.13.0", "--", "openapi-typescript", spec,
    "--output", new URL("contract.ts", target).pathname], { stdio: "inherit" });

  const lines = Object.entries(schoolPaths).flatMap(([path, methods]) =>
    Object.keys(methods).filter((method) => ["get", "post", "patch"].includes(method)).map((method) =>
      `  [${JSON.stringify(method.toUpperCase())}, ${JSON.stringify(path)}],`),
  );
  writeFileSync(new URL("school-routes.ts", target), [
    "// Generated from lss-api/openapi.json by scripts/generate-school-contract.mjs.",
    "export const schoolRoutes = [", ...lines, "] as const;", "",
  ].join("\n"));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
