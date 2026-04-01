import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [solidPlugin(), basicSsl()],
  server: {
    host: "0.0.0.0",
    https: true,
    port: 3001,
    allowedHosts: "all",
    proxy: {
      "/api": {
        target: "http://server:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["@solidjs/router"],
  },
});
