import { defineConfig } from 'vite'

// Separate from vite.config.js on purpose — keeps the production build
// config free of test-only concerns. Pure-logic unit tests only need a
// plain Node environment; component tests would need 'jsdom' added here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
