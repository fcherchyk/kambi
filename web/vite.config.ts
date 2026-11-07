/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, type ServerOptions } from "vite";

export const DEV_PORT = 5174;
export const DEFAULT_API_URL = "http://localhost:8001";

/** Dev server on the fixed port, proxying `/api` to the API so the browser sees one origin. */
export function serverOptions(apiUrl: string | undefined): ServerOptions {
  return {
    host: true,
    port: DEV_PORT,
    strictPort: true,
    proxy: {
      "/api": { target: apiUrl || DEFAULT_API_URL, changeOrigin: false },
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: serverOptions(process.env.API_URL),
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/api/schema.ts",
        "src/main.tsx",
      ],
      reporter: ["text", "text-summary"],
      thresholds: { lines: 80 },
    },
  },
});
