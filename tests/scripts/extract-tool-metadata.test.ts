import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { buildRegistry } from '../../scripts/extract-tool-metadata'

describe('extract-tool-metadata', () => {
  it('builds registry with all registered tools', async () => {
    const registry = await buildRegistry()
    const routeSource = readFileSync(path.join(process.cwd(), 'src/app/api/mcp/route.ts'), 'utf8')
    const registerToolCount = (routeSource.match(/registerTool\(/g) ?? []).length

    expect(registry.serverInfo.name).toBeTruthy()
    expect(registry.serverInfo.version).toBeTruthy()
    expect(registry.serverInfo.description).toBeTruthy()
    expect(registry.serverInfo.iconUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)

    expect(registry.tools.length).toBe(registerToolCount)
    expect(Array.isArray(registry.resources)).toBe(true)
    expect(Array.isArray(registry.prompts)).toBe(true)
    expect(registry.resources.length).toBeGreaterThan(0)
    expect(registry.prompts.length).toBeGreaterThan(0)

    const toolNames = registry.tools.map((tool) => tool.name)
    const resourceNames = registry.resources.map((resource) => resource.name)
    const promptNames = registry.prompts.map((prompt) => prompt.name)
    expect(toolNames).toContain('get_service_info')
    expect(toolNames).toContain('submit_ready_batch')
    expect(resourceNames).toEqual(
      expect.arrayContaining([
        'mapping_glossary',
        'mode_priority_matrix',
        'common_error_guidance',
      ]),
    )
    expect(promptNames).toEqual(
      expect.arrayContaining([
        'batch_onboarding_flow',
        'batch_error_triage_fix_loop',
        'submit_preflight_confirmation',
      ]),
    )
  })

  it('extracts parameter descriptions for inline zod schemas', async () => {
    const registry = await buildRegistry()
    const reportIssue = registry.tools.find((tool) => tool.name === 'report_issue')
    const createFixScript = registry.tools.find((tool) => tool.name === 'create_fix_script')

    expect(reportIssue).toBeDefined()
    expect(reportIssue?.parameters.map((parameter) => parameter.name)).toEqual(['title', 'body'])
    expect(reportIssue?.parameters[0]?.description).toContain('Short descriptive title')

    expect(createFixScript).toBeDefined()
    expect(createFixScript?.parameters.map((parameter) => parameter.type)).toEqual(['string', 'string', 'string'])
  })
  it('extracts annotations for selected hardened tools', async () => {
    const registry = await buildRegistry()
    const submitReadyBatch = registry.tools.find((tool) => tool.name === 'submit_ready_batch')
    const getRawHeaders = registry.tools.find((tool) => tool.name === 'get_raw_headers')

    expect(submitReadyBatch?.annotations).toEqual(expect.objectContaining({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    }))

    expect(getRawHeaders?.annotations).toEqual(expect.objectContaining({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }))
  })
})
