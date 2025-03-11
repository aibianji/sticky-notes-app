import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vite options tailored for Tauri development
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    watch: {
      usePolling: true
    }
  },
  
  // Tauri expects a fixed port, fail if that port is not available
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  
  build: {
    // Tauri supports es2021
    target: ['es2021', 'chrome100', 'safari13'],
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG
  },

  optimizeDeps: {
    include: ['@tauri-apps/api']
  },

  resolve: {
    alias: {
      '@': '/src'
    }
  }
}) 