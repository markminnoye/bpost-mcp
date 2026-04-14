import { describe, expect, it } from 'vitest'
import { buildMcpServerInfo } from '@/lib/mcp/server-info'

describe('buildMcpServerInfo', () => {
  const baseInput = {
    name: 'bpost-emasspost',
    version: '0.2.3',
    title: 'BPost e-MassPost',
    description: 'BPost e-MassPost connector',
    websiteUrl: 'https://bpost.example',
    icons: [{ src: 'https://bpost.example/mcp-server-icon.svg', mimeType: 'image/svg+xml', sizes: 'any' }],
  }

  it('returns minimal server info when all optional flags are disabled', () => {
    const serverInfo = buildMcpServerInfo({
      ...baseInput,
      enableTitle: false,
      enableDescription: false,
      enableWebsiteUrl: false,
      enableIcons: false,
    })

    expect(serverInfo).toEqual({
      name: baseInput.name,
      version: baseInput.version,
    })
  })

  it('includes title when title flag is enabled', () => {
    const serverInfo = buildMcpServerInfo({
      ...baseInput,
      enableTitle: true,
      enableDescription: false,
      enableWebsiteUrl: false,
      enableIcons: false,
    })

    expect(serverInfo).toEqual({
      name: baseInput.name,
      version: baseInput.version,
      title: baseInput.title,
    })
  })

  it('includes description when description flag is enabled', () => {
    const serverInfo = buildMcpServerInfo({
      ...baseInput,
      enableTitle: false,
      enableDescription: true,
      enableWebsiteUrl: false,
      enableIcons: false,
    })

    expect(serverInfo).toEqual({
      name: baseInput.name,
      version: baseInput.version,
      description: baseInput.description,
    })
  })

  it('includes websiteUrl and icons when their flags are enabled', () => {
    const serverInfo = buildMcpServerInfo({
      ...baseInput,
      enableTitle: false,
      enableDescription: false,
      enableWebsiteUrl: true,
      enableIcons: true,
    })

    expect(serverInfo).toEqual({
      name: baseInput.name,
      version: baseInput.version,
      websiteUrl: baseInput.websiteUrl,
      icons: baseInput.icons,
    })
  })
})
