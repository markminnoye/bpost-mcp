/**
 * Bundles the web POC (/masspost/poc) into one self-contained HTML file that opens from file://
 * and works offline: React, SheetJS, the masspost library and the CSS are all inlined.
 *
 * Usage: npm run build:poc  →  dist/masspost-poc.html
 *
 * The link to the rules page uses NEXT_PUBLIC_DOCS_URL (from .env.local when present).
 * Without it, the link is hidden, as in the web app.
 */
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ENTRY = 'src/app/(tools)/masspost/poc/standalone.tsx'
const OUT_FILE = 'dist/masspost-poc.html'

/** Keeps inlined code from closing its own <script> or <style> tag. */
function inlineSafe(code: string, tag: 'script' | 'style'): string {
  return code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`)
}

async function main() {
  const docsUrl = (process.env.NEXT_PUBLIC_DOCS_URL ?? '').replace(/\/+$/, '')
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    outdir: 'dist/masspost-poc',
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    minify: true,
    legalComments: 'eof',
    tsconfig: 'tsconfig.json',
    define: {
      'process.env.NODE_ENV': '"production"',
      __DOCS_URL__: JSON.stringify(docsUrl),
    },
    logLevel: 'warning',
  })

  const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? ''
  const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? ''
  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Proef: adreslijst nakijken</title>
<style>body{margin:0}</style>
<style>${inlineSafe(css, 'style')}</style>
</head>
<body>
<div id="root"></div>
<script>${inlineSafe(js, 'script')}</script>
</body>
</html>
`
  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, html, 'utf8')
  const kb = Math.round(Buffer.byteLength(html) / 1024)
  console.log(`${OUT_FILE}: ${kb} KB${docsUrl ? '' : ' (zonder link naar de documentatie: NEXT_PUBLIC_DOCS_URL ontbreekt)'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
