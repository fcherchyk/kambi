// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { describe, expect, it } from "vitest";
import { serverOptions } from "../../vite.config";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** The lines of one top-level service in docker-compose.yml. */
function composeService(name: string): string {
  const compose = read("../../../docker-compose.yml");
  const start = compose.indexOf(`\n  ${name}:\n`);
  const rest = compose.slice(start + 1);
  const end = rest.search(/\n {2}\w[\w-]*:\n|\n\w/);
  return end < 0 ? rest : rest.slice(0, end);
}

describe("dev server and compose", () => {
  it("S1_AC1: Vite serves on 5174 with strictPort and proxies /api to localhost:8001 by default", () => {
    const options = serverOptions(undefined);
    expect(options.port).toBe(5174);
    expect(options.strictPort).toBe(true);
    expect(options.host).toBe(true);
    expect(options.proxy?.["/api"]).toMatchObject({
      target: "http://localhost:8001",
    });
  });

  it("S1_AC1: API_URL=http://api:8001 sends the proxy to the api service", () => {
    expect(serverOptions("http://api:8001").proxy?.["/api"]).toMatchObject({
      target: "http://api:8001",
    });
  });

  it("S1_AC1: the web service builds ./web, publishes 127.0.0.1:5174 and keeps node_modules in a volume", () => {
    const web = composeService("web");
    expect(web).toContain("build: ./web");
    expect(web).toContain('"127.0.0.1:5174:5174"');
    expect(web).toContain("web-node-modules:/app/node_modules");
    expect(web).toContain("API_URL: http://api:8001");
  });

  it("S1_AC1: the dev server compiles a component with every plugin (their dependencies are installed)", async () => {
    // Vitest skips the React plugin's Babel step (Fast Refresh): only the dev server runs it.
    const server = await createServer({
      root: fileURLToPath(new URL("../..", import.meta.url)),
      configFile: fileURLToPath(
        new URL("../../vite.config.ts", import.meta.url),
      ),
      logLevel: "silent",
      server: { middlewareMode: true, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const result = await server.transformRequest("/src/App.tsx");
      expect(result?.code).toContain("$RefreshReg$");
    } finally {
      await server.close();
    }
  }, 30_000);

  it("S1_AC1: the Dockerfile uses a fixed pnpm store and CI=true", () => {
    const dockerfile = read("../../Dockerfile");
    expect(dockerfile).toMatch(/npm_config_store_dir=\/pnpm-store/);
    expect(dockerfile).toMatch(/CI=true/);
    expect(dockerfile).toMatch(/pnpm install --frozen-lockfile/);
    expect(dockerfile).toMatch(/EXPOSE 5174/);
  });
});
