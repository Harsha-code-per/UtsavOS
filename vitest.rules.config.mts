import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Security-rules tests run in Node against the Firestore emulator (npm run test:rules).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["rules/**/*.test.ts"], testTimeout: 20_000 },
});
