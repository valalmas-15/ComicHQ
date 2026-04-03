import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    host: "0.0.0.0",
    https: false,
    port: 3001,
    allowedHosts: true,
    hmr: {
      // Comment these out for local development access (192.168.1.50:3001)
      // Enable them only if you are using a proxy (like Cloudflare Tunnel) with HTTPS
      // protocol: "wss",
      // clientPort: 443,
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