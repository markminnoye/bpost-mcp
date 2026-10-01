/**
 * Fails when generated service or library docs do not match a fresh `docs:build`.
 * Run after `npm run docs:build`.
 * Hand-written pages (everything else under docs/, including docs/gitbook-docs.yaml) are not part of this check.
 */
import { execFileSync } from 'node:child_process'

const paths = ['docs/ontwikkelaars/library', 'docs/ontwikkelaars/api/openapi.yaml']
const status = execFileSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--', ...paths],
  { encoding: 'utf8' },
)

if (status.trim()) {
  console.error('Generated docs are out of date.')
  console.error('Run `npm run docs:build` and commit docs/ontwikkelaars/library and docs/ontwikkelaars/api/openapi.yaml.')
  console.error(status)
  console.error(execFileSync('git', ['diff', '--', ...paths], { encoding: 'utf8' }))
  process.exit(1)
}
