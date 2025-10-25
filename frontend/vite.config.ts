// Read from Node env when running Vite config; default to local API
const API_PROXY_TARGET = (globalThis as any).process?.env?.VITE_API_PROXY_TARGET || 'http://localhost:8080';

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    proxy: {
      // When running plain `vite dev`, proxy API to your Go backend
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
