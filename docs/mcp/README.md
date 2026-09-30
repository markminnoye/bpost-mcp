# MCP

De MCP-server hoort niet in de OpenAPI-spec van de HTTP-service (`docs/service-api/`). Een aparte MCP-spec kan later ergens anders gehost worden; die staat hier nog niet.

## Officiële URL

De officiële URL is **`/mcp`** (`src/app/mcp/route.ts`). **`/api/mcp`** blijft werken als legacy-alias (rewrite in `next.config.ts`).

`server.json`, de root-README, de install-prompt en OAuth resource-matching (`src/lib/oauth/resource-url.ts`) gebruiken `/mcp` als canonieke path. Padconstanten staan in `src/lib/mcp/paths.ts`.
