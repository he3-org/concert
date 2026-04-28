import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  shims: true,
  outExtension: () => ({ js: '.js' }),
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Optional peer dep: lazy-loaded by src/mcp/server.ts. Must NOT be bundled
  // so users who skip MCP avoid pulling in the SDK at install time.
  external: ['@modelcontextprotocol/sdk'],
});
