import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5174',
  },
  webServer: [
    {
      command:
        'uv run python scripts/e2e_db.py create && uv run alembic upgrade head && uv run uvicorn radio_backend.main:app --host 0.0.0.0 --port 8001',
      cwd: '../backend',
      url: 'http://localhost:8001/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: 'postgresql+asyncpg://radio:radio@localhost:5432/radio_e2e',
        SECRET_KEY: 'e2e-secret-key-with-at-least-32-bytes-length',
        CORS_ORIGINS: '["http://localhost:5174"]',
        FRONTEND_URL: 'http://localhost:5174',
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
      },
    },
    {
      command: 'npm run dev -- --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: 'http://localhost:8001',
      },
    },
  ],
  reporter: [['list']],
})
