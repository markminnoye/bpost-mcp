import { describe, it, expect } from 'vitest'
import packageJson from '../../package.json'
import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'

describe('app-version', () => {
  it('exports version from package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('exports stable MCP display name', () => {
    expect(MCP_SERVER_DISPLAY_NAME).toBe('bpost-emasspost')
  })
})
