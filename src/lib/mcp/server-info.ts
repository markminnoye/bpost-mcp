export type McpServerInfo = {
  name: string
  version: string
  title?: string
  description?: string
  websiteUrl?: string
  icons?: Array<{ src: string; mimeType: string; sizes: string[] }>
}

type BuildMcpServerInfoInput = {
  name: string
  version: string
  title: string
  description: string
  websiteUrl: string
  icons: Array<{ src: string; mimeType: string; sizes: string[] }>
  enableTitle: boolean
  enableDescription: boolean
  enableWebsiteUrl: boolean
  enableIcons: boolean
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
    ...(input.enableWebsiteUrl ? { websiteUrl: input.websiteUrl } : {}),
    ...(input.enableIcons ? { icons: input.icons } : {}),
  }
}
