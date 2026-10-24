/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// API prefixes served by the FastAPI backend. SPA routes deliberately avoid
// these (the app uses /console for admin and /account for readers) so a page
// refresh never collides with an API route.
const API_PREFIXES = ["/auth", "/articles", "/public", "/serve-ad", "/serve-ads", "/interactions", "/ads", "/admin", "/users", "/health"];

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      API_PREFIXES.map((p) => [p, { target: process.env.VITE_DEV_API ?? "http://127.0.0.1:8000", changeOrigin: true }]),
    ),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
