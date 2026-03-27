import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"],
  target: "node18",
  clean: true,
  dts: false,
  shims: true,
  outExtension: () => ({ js: ".js" }),
  banner: {
    js: "#!/usr/bin/env node",
  },
});
