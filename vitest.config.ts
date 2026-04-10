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
      // Must satisfy env.ts + jwt tests; same value as tests/lib/oauth/jwt.test.ts TEST_SECRET
      OAUTH_JWT_SECRET: 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE=',
    },
  },
})
