import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  readConfig,
  readConfigRaw,
  writeConfig,
  modifyConfigField,
  detectProjectName,
  resolveConfigPath,
} from "../lib/config.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-config-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readConfig", () => {
  it("returns null for non-existent file", () => {
    expect(readConfig(tmpDir)).toBeNull();
  });

  it("correctly parses valid JSONC with comments", () => {
    const content = `{
  // this is a comment
  "project_name": "my-project",
  "concert_version": "0.1.0"
}`;
    fs.writeFileSync(path.join(tmpDir, "concert.jsonc"), content);
    const config = readConfig(tmpDir);
    expect(config).not.toBeNull();
    expect(config?.project_name).toBe("my-project");
    expect(config?.concert_version).toBe("0.1.0");
  });

  it("throws on invalid JSONC", () => {
    fs.writeFileSync(path.join(tmpDir, "concert.jsonc"), "{ invalid json }");
    expect(() => readConfig(tmpDir)).toThrow();
  });
});

describe("readConfigRaw", () => {
  it("returns null for non-existent file", () => {
    expect(readConfigRaw(tmpDir)).toBeNull();
  });

  it("returns raw text including comments", () => {
    const content = `{
  // this is a comment
  "key": "value"
}`;
    fs.writeFileSync(path.join(tmpDir, "concert.jsonc"), content);
    const raw = readConfigRaw(tmpDir);
    expect(raw).toBe(content);
    expect(raw).toContain("// this is a comment");
  });
});

describe("writeConfig", () => {
  it("writes content to concert.jsonc", () => {
    const content = '{ "project_name": "test" }';
    writeConfig(tmpDir, content);
    const configPath = resolveConfigPath(tmpDir);
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.readFileSync(configPath, "utf-8")).toBe(content);
  });
});

describe("modifyConfigField", () => {
  it("sets a top-level field preserving comments", () => {
    const raw = `{
  // top comment
  "project_name": "old-name",
  "version": "1.0.0"
}`;
    const result = modifyConfigField(raw, ["project_name"], "new-name");
    expect(result).toContain("new-name");
    expect(result).toContain("// top comment");
    expect(result).not.toContain("old-name");
  });

  it("sets a nested field preserving comments", () => {
    const raw = `{
  // comment
  "execution": {
    "mode": "wave",
    "max_review_iterations": 3
  }
}`;
    const result = modifyConfigField(
      raw,
      ["execution", "max_review_iterations"],
      5,
    );
    expect(result).toContain("5");
    expect(result).toContain("// comment");
    const parsed = JSON.parse(result.replace(/\/\/.*/g, ""));
    expect(parsed.execution.max_review_iterations).toBe(5);
  });
});

describe("detectProjectName", () => {
  it("reads name from package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-package", version: "1.0.0" }),
    );
    expect(detectProjectName(tmpDir)).toBe("my-package");
  });

  it("strips scope prefix from package.json name", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "@my-org/my-package" }),
    );
    expect(detectProjectName(tmpDir)).toBe("my-package");
  });

  it("falls back to directory name when no package.json", () => {
    const result = detectProjectName(tmpDir);
    expect(result).toBe(path.basename(tmpDir));
  });

  it("falls back to directory name when package.json has no name", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ version: "1.0.0" }),
    );
    expect(detectProjectName(tmpDir)).toBe(path.basename(tmpDir));
  });
});
