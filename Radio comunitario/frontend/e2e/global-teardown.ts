import { execSync } from 'node:child_process'

export default function globalTeardown(): void {
  execSync('uv run python scripts/e2e_db.py drop', {
    cwd: '../backend',
    stdio: 'inherit',
  })
}
