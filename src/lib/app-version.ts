import packageJson from '../../package.json'

/** Semantic version from package.json (MCP serverInfo and user-facing support). */
export const APP_VERSION: string = packageJson.version

/** Stable MCP product name for initialize / support. */
export const MCP_SERVER_DISPLAY_NAME = 'bpost-emasspost'
