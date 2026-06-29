import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion': ['framer-motion'],
          'firebase':      ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
          'react-vendor':  ['react', 'react-dom'],
        }
      }
    }
  }
})