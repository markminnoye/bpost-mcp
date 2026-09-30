/**
 * Fails when docs/api-reference does not match a fresh `docs:build`.
 * Run after `npm run docs:build`.
 */
import { execFileSync } from 'node:child_process'

const status = execFileSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--', 'docs/api-reference'],
  { encoding: 'utf8' },
)

if (status.trim()) {
  console.error('Generated docs in docs/api-reference are out of date.')
  console.error('Run `npm run docs:build` and commit the result.')
  console.error(status)
  console.error(execFileSync('git', ['diff', '--', 'docs/api-reference'], { encoding: 'utf8' }))
  process.exit(1)
}
