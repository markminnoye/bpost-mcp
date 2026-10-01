# HTTP-API

De routes met hun authenticatie staan in het [API-overzicht](overzicht.md). De exacte request- en responsevormen staan in de [OpenAPI-referentie](openapi.yaml) (OpenAPI 3.1). Dat bestand wordt gegenereerd uit de Zod-schema's. Pas het niet met de hand aan: wijzig het schema en draai `npm run docs:build`.

## Voorbeeld: kolomkoppeling voorstellen

```bash
curl -X POST "$BASE_URL/api/masspost/suggest-mapping" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"headers":["Voornaam","Familienaam","Straat","Huisnummer","Postcode","Gemeente"]}'
```

Het antwoord bevat `mapping`, `confidence`, `rationale`, `unmatchedHeaders`, `needsAi` en `source` (`heuristic` of `ai`). Zie [Kolom-mapping](../kolom-mapping.md) voor wanneer de AI-terugval gebruikt wordt.

## Niet in deze spec

MCP (`/mcp`).
