# HTTP-API

De routes met hun authenticatie staan in het [API-overzicht](overzicht.md). De exacte request- en responsevormen staan in de [OpenAPI-referentie](openapi.yaml) (OpenAPI 3.1). Dat bestand wordt gegenereerd uit de Zod-schema's. Pas het niet met de hand aan: wijzig het schema en draai `npm run docs:build`.

## Voorbeeld: een AI-voorstel voor de kolomkoppeling

```bash
curl -X POST "$BASE_URL/api/masspost/suggest-mapping" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rowCount":120,"columns":[{"header":"Naam","filled":120,"examples":["Jxx Pxxxxxx"]},{"header":"Adres","filled":120,"examples":["Kxxxstraat 12"]},{"header":"Gemeente","filled":120,"examples":["9000 Gent"]}]}'
```

Het antwoord bevat `mapping` (de blokken in envelopvolgorde), `context` en `ignore`, met elke kolom precies één keer. De voorbeelden horen gemaskeerd te zijn (`maskValue`); de server maskeert ze opnieuw. Zie [Kolom-mapping](../kolom-mapping.md).

## Niet in deze spec

MCP (`/mcp`).
