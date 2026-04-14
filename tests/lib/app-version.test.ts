import { describe, it, expect } from 'vitest'
import packageJson from '../../package.json'
import {
  APP_VERSION,
  MCP_SERVER_DISPLAY_NAME,
  MCP_SERVER_ICON_PUBLIC_PATH,
  buildMcpServerIcons,
} from '@/lib/app-version'

describe('app-version', () => {
  it('exports version from package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/)
  })

  it('exports stable MCP display name', () => {
    expect(MCP_SERVER_DISPLAY_NAME).toBe('bpost-emasspost')
  })

  it('buildMcpServerIcons puts HTTPS URL first', () => {
    const icons = buildMcpServerIcons('https://bpost.example.com/')
    expect(icons[0]?.src).toBe(`https://bpost.example.com${MCP_SERVER_ICON_PUBLIC_PATH}`)
    expect(icons[0]?.mimeType).toBe('image/svg+xml')
    expect(icons[0]?.sizes).toBe('any')
    expect(icons[1]?.src).toMatch(/^data:image\/svg\+xml;base64,/)
  })
})
