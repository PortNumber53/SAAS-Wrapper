// Read from Node env when running Vite config; default to local API
const API_PROXY_TARGET = (globalThis as any).process?.env?.VITE_API_PROXY_TARGET || 'http://localhost:8080';

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build' || mode === 'production'
  return {
    // In dev, run a plain Vite server (no Cloudflare plugin) and proxy /api
    // to your running Worker via Wrangler. In build, use the Cloudflare plugin.
    plugins: [react(), isBuild ? cloudflare() : undefined].filter(Boolean) as any,
    server: {
      proxy: {
        '/api': {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          // Do not rewrite the path; the Worker expects '/api/*'
          xfwd: true,
        },
      },
    },
  }
})
