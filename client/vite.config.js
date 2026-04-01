import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solidPlugin()
  ],
  server: {
    host: '0.0.0.0',
    port: 3001,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
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


