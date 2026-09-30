# MCP

De MCP-server hoort niet in de OpenAPI-spec van de HTTP-service (`docs/service-api/`). Een aparte MCP-spec kan later ergens anders gehost worden; die staat hier nog niet.

## Officiële URL

De officiële URL is **`/mcp`**. **`/api/mcp`** blijft werken als legacy-alias.

Die verplaatsing zit in draft-PR [#40](https://github.com/markminnoye/bpost-mcp/pull/40) op branch `refactor/mcp-route-at-root`. Die PR wordt vóór deze documentatie gemerged.

Tot die PR binnen is, wijzen `server.json`, de root-README en `src/lib/oauth/resource-url.ts` het registry-adres nog naar `/api/mcp`. Dat is de legacy-alias, niet het hoofdpad. De install-prompt noemt al `/mcp`.
