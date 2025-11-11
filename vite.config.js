import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@portfolio": resolve(__dirname, "assets/portfolio"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    include: ["three"],
  },
});
