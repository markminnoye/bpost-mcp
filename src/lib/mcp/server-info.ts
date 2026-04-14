export type McpServerInfo = {
  name: string
  version: string
  title: string
  description: string
  websiteUrl: string
  icons: Array<{ src: string; mimeType: string; sizes: string[] }>
}

type BuildMcpServerInfoInput = {
  name: string
  version: string
  title: string
  description: string
  websiteUrl: string
  icons: McpServerInfo['icons']
}

/** Full MCP `initialize.serverInfo` (no feature flags — all fields always sent). */
export function buildMcpServerInfo(input: BuildMcpServerInfoInput): McpServerInfo {
  return {
    name: input.name,
    version: input.version,
    title: input.title,
    description: input.description,
    websiteUrl: input.websiteUrl,
    icons: input.icons,
  }
}
