# Design: install prompt op `/install` met kopieerknop

**Status:** Goedgekeurd (2026-04-11)  
**Doel:** `docs/install/install-prompt.md` één-klik naar het klembord voor niet-technische gebruikers, met correcte publieke URL per omgeving.

## Beslissingen

1. **`GET /api/install/prompt`** leest `docs/install/install-prompt.md` en retourneert `text/markdown; charset=utf-8`.
2. **URL-substitutie:** alle voorkomens van `https://bpost-mcp.vercel.app` worden vervangen door `env.NEXT_PUBLIC_BASE_URL` (zonder trailing slash), zodat staging/custom domein klopt en er geen vaste prod-URL in de gekopieerde tekst staat.
3. **UI:** kleine clientcomponent op `/install` — knop “Kopieer prompt”, Vlaams, `aria-live` voor succes/fout; `fetch` + `navigator.clipboard.writeText`.
4. **Cache:** `Cache-Control: public, max-age=300` (prompt wijzigt zelden; bij deploy vernieuwt CDN).

## Tests

- Unit: `getInstallPromptMarkdown` vervangt legacy base-URL bij gemockte `readFile`.
- Route: `GET` 200 en body van gemockte loader ( dunne smoke).

## Buiten scope

- Volledige vertaling van de bestaande Engelse `/install`-paragrafen (aparte taak).
