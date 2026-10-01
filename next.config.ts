import type { NextConfig } from "next";
import { MCP_CANONICAL_PATH, MCP_LEGACY_PATH } from "./src/lib/mcp/paths";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles so the alias is not shadowed if a route file appears under app/api/mcp.
      beforeFiles: [
        { source: MCP_LEGACY_PATH, destination: MCP_CANONICAL_PATH },
      ],
    };
  },
};

export default nextConfig;
