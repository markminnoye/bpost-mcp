/**
 * Fails when generated service or library docs do not match a fresh `docs:build`.
 * Run after `npm run docs:build`.
 * Hand-written pages (docs/mcp, docs/README.md) are not part of this check.
 */
import { execFileSync } from 'node:child_process'

const paths = ['docs/library', 'docs/service-api/openapi.yaml']
const status = execFileSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--', ...paths],
  { encoding: 'utf8' },
)

if (status.trim()) {
  console.error('Generated docs are out of date.')
  console.error('Run `npm run docs:build` and commit docs/library and docs/service-api/openapi.yaml.')
  console.error(status)
  console.error(execFileSync('git', ['diff', '--', ...paths], { encoding: 'utf8' }))
  process.exit(1)
}
