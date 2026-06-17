import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — changes almost never
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'vendor-react';
          }
          // Radix UI primitives — stable, large
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // Recharts
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
            return 'vendor-charts';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'vendor-date';
          }
          // State management
          if (id.includes('node_modules/zustand/')) {
            return 'vendor-state';
          }
          // Auth client
          if (id.includes('node_modules/better-auth/')) {
            return 'vendor-auth';
          }
          // xlsx is loaded dynamically — no chunk needed here
        },
      },
    },
  },
})
