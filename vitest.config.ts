// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
    env: {
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    },
  },
})
