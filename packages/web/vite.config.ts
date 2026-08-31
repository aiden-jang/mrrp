import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 30005,
    strictPort: true,
    // `ws` is what carries the live channel's upgrade. Without it the socket 400s in dev only, and
    // production looks fine because the Worker serves these assets itself with no proxy in between.
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
});
