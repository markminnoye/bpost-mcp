# ADR 0011: De mailings-webapp verlaat deze repository

## Status

Accepted

## Context

De mailings-webapp (overzicht, flow, Instellingen, library `src/core/masspost`) en de MCP-server deelden deze repository en dezelfde Neon-database. De webapp staat nu in de private repository `e-masspost-webapp`. Deze repository blijft de MCP-server, de OAuth-server, de batch-upload, `/install` en `/reference`.

De GitBook-zijbalk had daardoor een groep **Documentatie: Webapp** en een groep **Ontwikkelaars: Library** (TypeDoc uit `src/core/masspost/index.ts`). Die bronnen zijn hier weg. ADR 0004 zegt dat een groep schrappen eerst een ADR vraagt.

## Decision

- De groepen **Documentatie: Webapp** en **Ontwikkelaars: Library** verdwijnen uit `docs/SUMMARY.md` en uit de `SUMMARY.md` van hun map.
- `npm run docs:code` en TypeDoc vallen weg. `npm run docs:build` genereert alleen nog `docs/ontwikkelaars/api/openapi.yaml`. `docs:check` faalt alleen als die spec achterloopt.
- De pagina's over de webapp en de library verhuizen mee naar `e-masspost-webapp`. Hier blijft een korte websitepagina die zegt waar de webapp nu staat.
- Drizzle-kolommen die de webapp nog gebruikt (`tenant_preferences` buiten barcode-strategie en -lengte) blijven in dit schema, zodat `db:push` ze niet dropt.

## Consequences

De publieke site toont geen handleiding meer voor de mailings-schermen. Die hoort bij de webapp-repository. Nieuwe HTTP-routes blijven via `scripts/generate-openapi.ts` in de OpenAPI-spec. Een library-referentie opnieuw genereren hier heeft geen bron meer.
