---
task: "project-scaffold"
title: "Initialize npm package with TypeScript and tsup build system"
depends_on: []
wave: 1
model: haiku
---

## Objective

Create the npm package skeleton for `@he3-org/concert` with TypeScript, tsup build, and all configuration files. This is pure scaffolding — no business logic.

## Files

Create these files:

- `package.json`
- `tsconfig.json`
- `tsup.config.ts`
- `.gitignore` (add `node_modules/`, `dist/`)
- `src/cli.ts` (stub entry point)

## Requirements

- FR-025: npm Package Distribution
- NFR-002: Minimal Dependencies

## Detailed Instructions

### package.json

```json
{
  "name": "@he3-org/concert",
  "version": "0.1.0",
  "description": "Opinionated agentic development lifecycle orchestrator",
  "type": "module",
  "bin": {
    "concert": "./dist/cli.js"
  },
  "files": [
    "dist",
    "templates"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit && vitest run"
  },
  "keywords": ["concert", "agentic", "development", "orchestration"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/he3-org/concert.git"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "jsonc-parser": "^3.3.1"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"],
  target: "node18",
  clean: true,
  dts: false,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
```

### src/cli.ts (stub)

```typescript
const args = process.argv.slice(2);
const command = args[0];

if (command === "--version" || command === "-V") {
  // Will be replaced with dynamic version reading
  console.log("0.1.0");
  process.exit(0);
}

if (command === "--help" || command === "-h" || !command) {
  console.log(`Usage: concert <command>

Commands:
  init     Initialize Concert in a repository
  update   Update Concert files to latest version
  push     Push current branch to origin

Options:
  --help, -h       Show this help message
  --version, -V    Show version number`);
  process.exit(0);
}

console.error(`Error: unknown command "${command}"

  Available commands: init, update, push

  Run "concert --help" for usage information.`);
process.exit(2);
```

### .gitignore additions

Add these lines to the existing .gitignore (or create if missing):

```
node_modules/
dist/
*.tsbuildinfo
```

## Tests

- `src/__tests__/cli.test.ts`: Test that the CLI stub routes --help, --version, and unknown commands correctly. Use vitest with `execSync` to call the built CLI.

## Acceptance Criteria

- [ ] `npm install` succeeds with no errors
- [ ] `npm run build` produces `dist/cli.js` with a shebang line
- [ ] `node dist/cli.js --help` prints usage information
- [ ] `node dist/cli.js --version` prints "0.1.0"
- [ ] `node dist/cli.js banana` exits with code 2 and prints an error
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
