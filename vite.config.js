import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion':   ['framer-motion'],
          // firebase/app stays eager (tiny, needed for initializeApp on every
          // load). firebase/firestore and firebase/auth are NOT grouped in
          // here on purpose — they're only ever reached via dynamic import()
          // (see loadFirestore()/loadAuth() in src/firebase.js), so Rollup
          // gives each its own async chunk that's fetched on demand instead
          // of being forced into the eager path by chunk grouping.
          'firebase-app':    ['firebase/app'],
          'react-vendor':    ['react', 'react-dom'],
        }
      }
    }
  }
})