import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
              return 'react-router';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
          if (id.includes('pages/dashboard/admin')) {
            return 'dashboard-admin';
          }
          if (id.includes('pages/dashboard/security')) {
            return 'dashboard-security';
          }
          if (id.includes('pages/dashboard/developer')) {
            return 'dashboard-developer';
          }
          if (id.includes('pages/dashboard/malware')) {
            return 'dashboard-malware';
          }
          if (id.includes('pages/dashboard/remediation')) {
            return 'dashboard-remediation';
          }
          if (id.includes('pages/dashboard/service-projects')) {
            return 'dashboard-service-projects';
          }
        },
      },
    },
  },
})
