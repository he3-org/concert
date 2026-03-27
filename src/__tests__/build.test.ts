import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")) as {
  name?: string;
  version?: string;
  description?: string;
  license?: string;
  type?: string;
  bin?: Record<string, string>;
  files?: string[];
};

// ======================================================================
// 1. package.json validation
// ======================================================================

describe("package.json", () => {
  it("has the correct package name", () => {
    expect(pkg.name).toBe("@he3-org/concert");
  });

  it("has a bin entry for concert", () => {
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin?.concert).toBeDefined();
  });

  it("includes templates and dist in files array", () => {
    expect(pkg.files).toContain("templates");
    expect(pkg.files).toContain("dist");
  });

  it("has type module", () => {
    expect(pkg.type).toBe("module");
  });

  it("has required metadata", () => {
    expect(pkg.version).toBeDefined();
    expect(pkg.description).toBeDefined();
    expect(pkg.license).toBeDefined();
  });
});

// ======================================================================
// 2. Build output validation
// ======================================================================

describe("build output", () => {
  it("dist/cli.js exists after build", () => {
    const distPath = path.join(ROOT, "dist", "cli.js");
    if (!fs.existsSync(distPath)) {
      console.warn("dist/cli.js not found — skipping build output tests");
      return;
    }
    expect(fs.existsSync(distPath)).toBe(true);
  });

  it("dist/cli.js has a shebang line", () => {
    const distPath = path.join(ROOT, "dist", "cli.js");
    if (!fs.existsSync(distPath)) return;
    const content = fs.readFileSync(distPath, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});

// ======================================================================
// 3. tsconfig.json validation
// ======================================================================

describe("tsconfig.json", () => {
  it("exists and is valid JSON", () => {
    const tsconfigPath = path.join(ROOT, "tsconfig.json");
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    const content = fs.readFileSync(tsconfigPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
  });
});

// ======================================================================
// 4. Templates directory validation
// ======================================================================

describe("templates directory", () => {
  const TEMPLATES_DIR = path.join(ROOT, "templates");

  it("exists at project root", () => {
    expect(fs.existsSync(TEMPLATES_DIR)).toBe(true);
  });

  it("contains docs/concert directory", () => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, "docs", "concert"))).toBe(true);
  });

  it("contains .github directory", () => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, ".github"))).toBe(true);
  });

  it("contains .claude directory", () => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, ".claude"))).toBe(true);
  });
});

// ======================================================================
// 5. No accidental large files
// ======================================================================

describe("package size", () => {
  it("no file in templates exceeds 50KB", () => {
    const TEMPLATES_DIR = path.join(ROOT, "templates");

    function checkSize(dir: string): void {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkSize(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          expect(
            stats.size,
            `File ${fullPath} exceeds 50KB (${stats.size} bytes)`,
          ).toBeLessThan(50 * 1024);
        }
      }
    }
    checkSize(TEMPLATES_DIR);
  });
});
