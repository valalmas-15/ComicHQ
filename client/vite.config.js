import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    host: "0.0.0.0",
    https: false,
    port: 3001,
    allowedHosts: "all",
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: "http://server:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});