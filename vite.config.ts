/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs separately (npm run dev starts both).
    proxy: { "/api": "http://localhost:8787" },
  },
  test: {
    environment: "node",
  },
});
