export type McpServerInfo = {
  name: string
  version: string
  title?: string
  description?: string
}

type BuildMcpServerInfoInput = {
  name: string
  version: string
  title: string
  description: string
  enableTitle: boolean
  enableDescription: boolean
}

/**
 * Keeps production-safe minimal metadata by default while allowing
 * phased rollout of optional initialize fields behind feature flags.
 */
export function buildMcpServerInfo(input: BuildMcpServerInfoInput): McpServerInfo {
  return {
    name: input.name,
    version: input.version,
    ...(input.enableTitle ? { title: input.title } : {}),
    ...(input.enableDescription ? { description: input.description } : {}),
  }
}
