import { describe, expect, it } from 'vitest'
import { buildMcpServerInfo } from '@/lib/mcp/server-info'

describe('buildMcpServerInfo', () => {
  const input = {
    name: 'bpost-emasspost',
    version: '0.3.0',
    title: 'BPost e-MassPost',
    description: 'BPost e-MassPost connector',
    websiteUrl: 'https://bpost.example',
    icons: [
      { src: 'https://bpost.example/mcp-server-icon.svg', mimeType: 'image/svg+xml', sizes: ['any'] },
    ],
  }

  it('returns full serverInfo with all metadata fields', () => {
    expect(buildMcpServerInfo(input)).toEqual(input)
  })
})
