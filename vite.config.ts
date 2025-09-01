import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    

    target: 'esnext', // Optimize for modern browsers
    minify: 'esbuild', // Use esbuild for faster minification


    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            '@supabase/supabase-js',
            'react',
            'react-dom',
            'wouter',
            '@tanstack/react-query'
          ],
          'ui': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ]
        },
        // Optimize chunk loading
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      },
      // Optimize dependencies
      treeshake: true
    },
    // Enable source map compression
    sourcemap: true,
    // Enable build caching
    cssCodeSplit: true,
    reportCompressedSize: false
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
