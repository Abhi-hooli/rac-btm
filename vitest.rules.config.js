import { defineConfig } from 'vite'

// Separate from vitest.config.js because these tests need a running
// Firestore emulator (started by `firebase emulators:exec` — see the
// "test:rules" script in package.json) and a longer timeout than pure
// unit tests, since each test does real round-trips to the emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
