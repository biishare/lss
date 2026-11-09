import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

// Compare local production builds without credentials, cookies or executing JS.
// This measures HTML and referenced script payloads, not browser load times.
const { values } = parseArgs({ options: {
  before: { type: "string" }, after: { type: "string" },
  "before-ref": { type: "string" }, "after-ref": { type: "string" },
} });
for (const name of ["before", "after", "before-ref", "after-ref"]) {
  if (!values[name]) throw new Error(`Falta --${name}`);
}
function localOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Use uma origem HTTP local, sem credenciais nem caminho.");
  }
  return url.origin;
}
async function get(url) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
const gzipBytes = (bytes) => gzipSync(bytes, { level: 9 }).length;
async function measure(origin, path) {
  const html = await get(new URL(path, origin));
  const source = html.toString("utf8");
  const scripts = [...new Set([...source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((match) => new URL(match[1].replaceAll("&amp;", "&"), origin).href))];
  const assets = [];
  for (const url of scripts) {
    if (new URL(url).origin !== origin) throw new Error("Script fora da origem local.");
    const bytes = await get(url);
    assets.push({ path: new URL(url).pathname, utf8Bytes: bytes.length, gzipBytes: gzipBytes(bytes), sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return {
    path, htmlUtf8Bytes: html.length, htmlGzipBytes: gzipBytes(html),
    initialHtmlHasLoginFields: /name="username"/.test(source) && /name="password"/.test(source),
    initialHtmlHasGlobalLoader: source.includes("A carregar os dados do LSS"),
    referencedScriptCount: assets.length,
    referencedScriptsUtf8Bytes: assets.reduce((sum, asset) => sum + asset.utf8Bytes, 0),
    referencedScriptsGzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
}
const result = {
  measuredAt: new Date().toISOString(),
  method: "Initial HTTP HTML and unique external script src references; no JS execution, browser cache, follow-up imports or load-time measurement. Gzip level 9 calculated per resource; not Vercel transfer sizes.",
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  builds: [],
};
for (const name of ["before", "after"]) {
  const origin = localOrigin(values[name]);
  const routes = [];
  for (const path of ["/", "/payments?year=2026&month=jun&period=month"]) routes.push(await measure(origin, path));
  result.builds.push({ label: name, ref: values[`${name}-ref`], routes });
}
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
