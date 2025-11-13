import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Your existing plugins are preserved
  plugins: [react(), tailwindcss()],

  // Your existing alias configuration is preserved
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Server configuration
  server: {
    // Improve HMR reliability
    hmr: {
      overlay: true,
    },
    // Force cache invalidation
    headers: {
      'Cache-Control': 'no-store',
    },
  },

  // Dependency optimization
  optimizeDeps: {
    // Force re-optimization to fix stale chunk references
    force: true,
    // Exclude problematic dependencies from pre-bundling if needed
    // exclude: ['some-problematic-package'],
  },

  // Build configuration
  build: {
    // Improve chunk handling
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Vite handle chunking automatically
      },
    },
  },
})