# MCP

De MCP-server hoort niet in de OpenAPI-spec van de HTTP-service (`docs/service-api/`). De route blijft bevroren. Een aparte MCP-spec kan later ergens anders gehost worden; die staat hier nog niet.

## Publiek pad

Het endpoint is **`/api/mcp`**. Er is geen rewrite en geen redirect van `/mcp` naar `/api/mcp`.

| Bron | Wat er staat |
|------|----------------|
| `src/app/api/mcp/route.ts` | Enige MCP-route. Next.js maakt daar `/api/mcp` van. Er is geen `src/app/mcp/`. |
| `next.config.ts` | Geen `rewrites` of `redirects`. |
| Middleware / proxy | Geen `middleware.ts`, geen `vercel.json`, geen proxy. |
| `server.json` | `remotes[0].url` eindigt op `/api/mcp`. `validate:server-manifest` eist dat. |
| `README.md` | Lokaal `http://localhost:3000/api/mcp`. Registry-URL is het publieke origin plus `/api/mcp`. |
| `docs/install/install-prompt.md` | Connector-URL is `https://…/api/mcp`. |
| `src/lib/oauth/resource-url.ts` | Canonieke resource is `{origin}/api/mcp`. |

Clients moeten `/api/mcp` gebruiken. `/mcp` is geen alias.
