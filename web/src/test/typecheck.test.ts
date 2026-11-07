// @vitest-environment node
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const CONFIG = fileURLToPath(new URL("../../tsconfig.json", import.meta.url));

describe("type check", () => {
  it("AC18: tsc --noEmit passes with strict", () => {
    const { config } = ts.readConfigFile(CONFIG, (path) =>
      ts.sys.readFile(path),
    );
    const parsed = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      fileURLToPath(new URL("../..", import.meta.url)),
    );
    expect(parsed.options.strict).toBe(true);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const messages = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    expect(messages).toEqual([]);
  }, 60_000);
});
