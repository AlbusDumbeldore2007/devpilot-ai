import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.{js,mjs,ts}'],
    globals: true,
    // Test files share one MongoDB database (and the CRUD suites hit a
    // live API on the same DB), so files must not run in parallel or
    // their cleanups delete each other's fixtures.
    fileParallelism: false,
  },
})
