import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderReferencePage } from '@/app/reference/page'
import type { ToolRegistry } from '@/lib/mcp/tool-registry-types'

describe('reference page', () => {
  it('renders all core sections from extracted data', () => {
    const fixture: ToolRegistry = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      serverInfo: {
        name: 'bpost-emasspost',
        version: '0.2.2-alpha.0',
        description: 'BPost e-MassPost connector',
        iconUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
      },
      instructions: 'System instructions',
      tools: [
        {
          name: 'demo_tool',
          description: 'Demo tool description',
          parameters: [
            {
              name: 'batchId',
              type: 'string',
              required: true,
              description: 'Batch id',
              source: "z.string().describe('Batch id')",
            },
          ],
          rawSchema: { source: 'z.object({ batchId: z.string() })', kind: 'z.object' },
        },
      ],
      resources: [],
      prompts: [],
    }

    const html = renderToStaticMarkup(renderReferencePage(fixture))

    expect(html).toContain('MCP Knowledge Transparency')
    expect(html).toContain('System instructions')
    expect(html).toContain('demo_tool')
    expect(html).toContain('Demo tool description')
  })
})
