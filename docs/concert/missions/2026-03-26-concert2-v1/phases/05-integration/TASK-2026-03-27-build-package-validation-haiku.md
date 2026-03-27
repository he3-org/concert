---
task: "build-package-validation"
title: "Validate build output, package.json, and npm publish readiness"
depends_on: ["template-validation"]
wave: 2
model: haiku
---

## Objective

Write tests and scripts that validate the package is ready for npm publishing: the build produces correct output, package.json has all required fields, the `files` array includes templates, and `npx @he3-org/concert` resolves correctly.

## Files

- `src/__tests__/build.test.ts`

## Requirements

- FR-025: npm Package Distribution
- Architecture Section 3: npm Package Structure

## Detailed Instructions

### src/__tests__/build.test.ts

Write tests that validate the package structure and build output. These tests read the project's configuration files and verify correctness.

**Test groups:**

#### 1. package.json validation

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));

describe("package.json", () => {
  it("has the correct package name", () => {
    expect(pkg.name).toBe("@he3-org/concert");
  });

  it("has a bin entry for concert", () => {
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.concert || pkg.bin["concert"]).toBeDefined();
  });

  it("includes templates in files array", () => {
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
```

#### 2. Build output validation

```typescript
describe("build output", () => {
  // These tests assume `npm run build` has been run
  // In CI, the build step runs before tests

  it("dist/cli.js exists after build", () => {
    const distPath = path.join(ROOT, "dist", "cli.js");
    // Skip if not built (development mode)
    if (!fs.existsSync(distPath)) {
      console.warn("dist/cli.js not found — skipping build output tests (run npm run build first)");
      return;
    }
    expect(fs.existsSync(distPath)).toBe(true);
  });

  it("dist/cli.js has a shebang line", () => {
    const distPath = path.join(ROOT, "dist", "cli.js");
    if (!fs.existsSync(distPath)) return;
    const content = fs.readFileSync(distPath, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node") || content.startsWith("#!")).toBe(true);
  });
});
```

#### 3. tsconfig validation

```typescript
describe("tsconfig.json", () => {
  it("exists and is valid JSON", () => {
    const tsconfigPath = path.join(ROOT, "tsconfig.json");
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    const content = fs.readFileSync(tsconfigPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
  });
});
```

#### 4. Templates directory is present

```typescript
describe("templates directory", () => {
  it("exists at project root", () => {
    expect(fs.existsSync(path.join(ROOT, "templates"))).toBe(true);
  });

  it("contains docs/concert directory", () => {
    expect(fs.existsSync(path.join(ROOT, "templates", "docs", "concert"))).toBe(true);
  });

  it("contains .github directory", () => {
    expect(fs.existsSync(path.join(ROOT, "templates", ".github"))).toBe(true);
  });

  it("contains .claude directory", () => {
    expect(fs.existsSync(path.join(ROOT, "templates", ".claude"))).toBe(true);
  });
});
```

#### 5. No accidental large files

```typescript
describe("package size", () => {
  it("no file in templates exceeds 50KB", () => {
    // Walk templates directory recursively
    function checkSize(dir: string): void {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkSize(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          expect(stats.size).toBeLessThan(50 * 1024); // 50KB max per file
        }
      }
    }
    checkSize(path.join(ROOT, "templates"));
  });
});
```

## Acceptance Criteria

- [ ] package.json validation checks: name, bin, files, type, metadata
- [ ] Build output validation checks dist/cli.js existence and shebang
- [ ] Templates directory presence is validated
- [ ] No template file exceeds 50KB
- [ ] All tests pass with `npm test`
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/typescript-standards/SKILL.md
