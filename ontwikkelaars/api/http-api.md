# HTTP-API

De routes met hun authenticatie staan in het [API-overzicht](overzicht.md). De exacte request- en responsevormen staan in de [OpenAPI-referentie](openapi.yaml) (OpenAPI 3.1). Dat bestand wordt gegenereerd uit de Zod-schema's. Pas het niet met de hand aan: wijzig het schema en draai `npm run docs:build`.

## Voorbeeld: een CSV-batch uploaden

```bash
curl -X POST "$BASE_URL/api/batches/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@adressen.csv"
```

Het antwoord bevat de `batchId`. De assistent gebruikt die id in de batch-tools.

## Niet in deze spec

MCP (`/mcp`).
