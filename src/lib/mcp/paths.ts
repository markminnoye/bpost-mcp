/**
 * Public paths for the MCP service.
 * The service API stays under `/api/...`. MCP is a separate surface so it can
 * move to another host later without taking the REST routes with it.
 */

/** Official streamable-HTTP path (`src/app/mcp/route.ts`). */
export const MCP_CANONICAL_PATH = '/mcp'

/**
 * Previous public path. `next.config.ts` rewrites this to {@link MCP_CANONICAL_PATH}.
 * OAuth resource matching treats both as the same protected resource.
 */
export const MCP_LEGACY_PATH = '/api/mcp'
