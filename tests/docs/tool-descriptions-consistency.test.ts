import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function extractToolDescriptionsFromRoute(routeSource: string): string[] {
  const descriptionExpressionRegex = /description:\s*((?:'[^']*'\s*\+\s*)*'[^']*')/g
  const descriptions: string[] = []

  for (const match of routeSource.matchAll(descriptionExpressionRegex)) {
    const expression = match[1] ?? ''
    const parts = [...expression.matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '')
    descriptions.push(parts.join(''))
  }

  return descriptions
}

describe('tool description consistency guardrails', () => {
  it('avoids legacy manual-upload wording across code and docs', () => {
    const routeSource = readRepoFile('src/app/api/mcp/route.ts')
    const readme = readRepoFile('README.md')
    const instructions = readRepoFile('src/lib/mcp/server-instructions.ts')

    const bannedPhrases = [
      'Returns a `curl` command for out-of-band CSV/Excel upload',
      'Returns a curl command for the user to upload a CSV/Excel file out-of-band.',
      'give the user a curl command; they upload and get a batchId',
    ]

    for (const phrase of bannedPhrases) {
      expect(routeSource).not.toContain(phrase)
      expect(readme).not.toContain(phrase)
      expect(instructions).not.toContain(phrase)
    }
  })

  it('enforces description policy across all registered tools', () => {
    const routeSource = readRepoFile('src/app/api/mcp/route.ts')
    const descriptions = extractToolDescriptionsFromRoute(routeSource)

    // Sanity check: keep this close to the number of registerTool calls.
    expect(descriptions.length).toBeGreaterThanOrEqual(14)

    const bannedPatterns = [
      /returns a curl command for the user to upload/i,
      /execute the following command in your local terminal/i,
    ]

    for (const description of descriptions) {
      for (const pattern of bannedPatterns) {
        expect(description).not.toMatch(pattern)
      }
    }
  })
})
