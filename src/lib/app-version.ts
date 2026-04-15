import packageJson from '../../package.json'

/** Semantic version from package.json (MCP serverInfo and user-facing support). */
export const APP_VERSION: string = packageJson.version

/** Stable MCP product name for initialize / support. */
export const MCP_SERVER_DISPLAY_NAME = 'bpost-emasspost'

/** Human-readable title for MCP host UIs (Le Chat, Claude, etc.). */
export const MCP_SERVER_DISPLAY_TITLE = 'BPost e-MassPost'

/** Public path to the MCP server icon (served from `public/`). Prefer HTTPS `src` in `icons` for client compatibility. */
export const MCP_SERVER_ICON_PUBLIC_PATH = '/mcp-server-icon.svg'

/** User-facing description for the MCP server. */
export const MCP_SERVER_DESCRIPTION = 'BPost e-MassPost connector — valideer adressen en maak zendingen aan.'

/** Source repo URL for MCP Registry `server.json` and docs. */
export const MCP_REGISTRY_GITHUB_REPO_URL = 'https://github.com/markminnoye/bpost-mcp'

/**
 * Canonical production origin for root `server.json` when `NEXT_PUBLIC_BASE_URL` and
 * `VERCEL_URL` are unset (e.g. local `npm run build`). Matches README install URL.
 */
export const MCP_REGISTRY_CANONICAL_ORIGIN = 'https://bpost.sonicrocket.be'

export type McpServerIconDescriptor = {
  src: string
  mimeType: 'image/svg+xml'
  /** MCP `Icon.sizes`: array of WxH strings or `"any"` for scalable SVG (spec 2025-11-25). */
  sizes: string[]
}

/** Base64 encoded SVG icon for the MCP server, ensuring it works independently of deployment URLs. */
const svgIcon = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100%" height="100%" viewBox="0 0 176 140" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
    <g transform="matrix(1,0,0,1,-8.756422,-27.276593)">
        <g>
            <path d="M131.994,65.109C131.39,76.453 127.797,89.751 120.808,104.192C103.228,140.53 69.393,165.084 45.673,156.242C27.504,149.489 24.337,124.304 33.821,94.78L55.04,88.409C53.174,91.145 51.406,94.095 49.756,97.228C37.822,119.872 37.012,143.515 47.93,150.037C58.849,156.57 77.373,143.506 89.293,120.873C98.306,103.783 100.977,86.141 97.063,75.7L131.994,65.109Z" style="fill:rgb(211,64,52);"/>
            <path d="M184.511,49.221C184.464,49.414 184.419,49.606 184.372,49.793C163.981,128.27 87.911,182.207 42.079,162.918C17.554,152.582 8.455,129.996 8.764,102.392L26.991,96.855C20.698,125.33 26,149.313 44.308,157.596C70.156,169.283 110.834,138.837 130.152,99.339C136.799,85.727 141.154,73.041 143.076,61.761L184.511,49.221Z" style="fill:rgb(211,64,52);"/>
            <path d="M53.628,72.166C72.263,51.169 98.638,37.194 111.289,48.823L122.057,34.208C101.619,16.132 69.526,36.022 49.663,63.82L53.628,72.166Z" style="fill:rgb(211,64,52);"/>
            <path d="M58.896,83.202C69.826,69.6 82.728,63.043 91.125,68.059C92.566,68.917 93.797,70.078 94.842,71.501L107.241,54.476C95.494,42.461 71.341,55.387 54.527,74.056L58.896,83.202Z" style="fill:rgb(211,64,52);"/>
        </g>
    </g>
</svg>`
export const MCP_SERVER_ICON_URL = `data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`

/**
 * Icons for `initialize` serverInfo. Puts an HTTPS URL first so strict clients
 * (e.g. some MCP UIs) that skip `data:` URIs still render the logo.
 */
export function buildMcpServerIcons(publicBaseUrl: string): McpServerIconDescriptor[] {
  const origin = publicBaseUrl.replace(/\/$/, '')
  return [
    {
      src: `${origin}${MCP_SERVER_ICON_PUBLIC_PATH}`,
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    },
    {
      src: MCP_SERVER_ICON_URL,
      mimeType: 'image/svg+xml',
      sizes: ['32x32'],
    },
  ]
}
