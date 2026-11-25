import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const apiPort = process.env.PORT ?? "8787";

export default defineConfig({
  root: "web",
  envDir: "..",
  plugins: [react()],
  server: { proxy: { "/api/": `http://localhost:${apiPort}` } },
  test: { root: ".", environment: "node", include: ["{web,server,shared}/**/*.test.{ts,tsx}"] },
});
