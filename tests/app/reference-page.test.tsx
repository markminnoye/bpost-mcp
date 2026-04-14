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
          description: 'Demo tool **description**',
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
    expect(html).toContain('<strong>description</strong>')
  })

  it('renders top index with all visible section links', () => {
    const fixture: ToolRegistry = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      serverInfo: { name: 'test', version: '1.0.0', description: '', iconUrl: '' },
      instructions: '',
      tools: [{ name: 'tool_a', description: 'A', parameters: [], rawSchema: { source: '', kind: 'none' } }],
      resources: [],
      prompts: [],
    }

    const html = renderToStaticMarkup(renderReferencePage(fixture))

    expect(html).toContain('Inhoud')
    expect(html).toContain('href="#server-info"')
    expect(html).toContain('href="#instructions"')
    expect(html).toContain('href="#tools"')
    expect(html).not.toContain('href="#resources"')
    expect(html).not.toContain('href="#prompts"')
  })

  it('includes resources and prompts index links when data is present', () => {
    const fixture: ToolRegistry = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      serverInfo: { name: 'test', version: '1.0.0', description: '', iconUrl: '' },
      instructions: '',
      tools: [{ name: 'tool_a', description: 'A', parameters: [], rawSchema: { source: '', kind: 'none' } }],
      resources: [{ name: 'res_a', description: 'R', uri: 'bpost://r', mimeType: 'text/plain', metadata: {} }],
      prompts: [{ name: 'prompt_a', description: 'P', arguments: [], metadata: {} }],
    }

    const html = renderToStaticMarkup(renderReferencePage(fixture))

    expect(html).toContain('href="#resources"')
    expect(html).toContain('href="#prompts"')
  })

  it('renders markdown in tool descriptions (bold, lists)', () => {
    const fixture: ToolRegistry = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      serverInfo: { name: 'test', version: '1.0.0', description: '', iconUrl: '' },
      instructions: 'Instructions with **bold** text and a list:\n- item one\n- item two',
      tools: [
        {
          name: 'md_tool',
          description: 'A tool with `inline code` and **strong** emphasis.',
          parameters: [],
          rawSchema: { source: 'z.object({})', kind: 'z.object' },
        },
      ],
      resources: [],
      prompts: [],
    }

    const html = renderToStaticMarkup(renderReferencePage(fixture))

    expect(html).toContain('<strong>strong</strong>')
    expect(html).toContain('<code>inline code</code>')
    expect(html).toContain('<li>item one</li>')
    expect(html).toContain('<li>item two</li>')
  })

  it('renders markdown in instructions block', () => {
    const fixture: ToolRegistry = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      serverInfo: { name: 'test', version: '1.0.0', description: '', iconUrl: '' },
      instructions: 'Step 1: do this\n- item one\n- item two\n\nSome **bold** word',
      tools: [],
      resources: [],
      prompts: [],
    }

    const html = renderToStaticMarkup(renderReferencePage(fixture))

    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<p>Step 1: do this</p>')
  })
})
