import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solidPlugin()
  ],
  server: {
    port: 3001,
    host: true, // Needed for Docker
    proxy: {
      '/api': {
        target: 'http://server:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@solidjs/router']
  }
});

