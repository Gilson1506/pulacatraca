import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'qr-scanner'],
    force: true, // Force re-optimization
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // Clear output directory completely
    emptyOutDir: true,
    // Generate unique hash for each build
    rollupOptions: {
      output: {
        // Aggressive cache busting with unique timestamps
        entryFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        assetFileNames: (assetInfo) => {
          // Special handling for worker files
          if (assetInfo.name?.includes('worker')) {
            return `assets/worker-${Date.now()}-[hash].[ext]`;
          }
          return `assets/[name]-${Date.now()}-[hash].[ext]`;
        }
      }
    }
  },
  // Force disable all caching during dev
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
});
