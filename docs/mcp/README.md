# MCP

De MCP-server hoort niet in de OpenAPI-spec van de HTTP-service (`docs/service-api/`). Een aparte MCP-spec kan later ergens anders gehost worden; die staat hier nog niet.

## Officiële URL

De officiële URL is **`/mcp`**. **`/api/mcp`** blijft werken als legacy-alias.

Die verplaatsing wordt doorgevoerd in een aparte draft-PR op branch `refactor/mcp-route-at-root`. Op GitHub stond daar op 30 september 2026 nog geen pull request; gebruik die branchnaam tot het nummer bekend is.

Tot die PR binnen is, wijzen `server.json`, de root-README en `src/lib/oauth/resource-url.ts` het registry-adres nog naar `/api/mcp`. Dat is de legacy-alias, niet het hoofdpad. De install-prompt noemt al `/mcp`.
