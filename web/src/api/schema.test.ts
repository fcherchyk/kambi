// @vitest-environment node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import openapiTS, { astToString, type OpenAPI3 } from "openapi-typescript";
import { describe, expect, it } from "vitest";

const SPEC_FILE = new URL("../../openapi.json", import.meta.url);
const SCHEMA_FILE = new URL("./schema.ts", import.meta.url);
const HEADER =
  "// Generated from web/openapi.json by openapi-typescript. Do not edit: run `pnpm gen:api`.\n\n";

async function generate(): Promise<string> {
  const spec = JSON.parse(readFileSync(SPEC_FILE, "utf8")) as OpenAPI3;
  return HEADER + astToString(await openapiTS(spec));
}

describe("generated API client", () => {
  it("S1_AC19: src/api/schema.ts is generated from the API's OpenAPI schema", async () => {
    const generated = await generate();
    // Bootstrap: a missing file (deleted on purpose to regenerate it) is written once.
    if (!existsSync(SCHEMA_FILE)) writeFileSync(SCHEMA_FILE, generated);
    expect(readFileSync(SCHEMA_FILE, "utf8")).toBe(generated);
  });
});
