# docs/

Deze map wordt door GitBook (Git Sync, branch `docs`) gelezen als **één publieke space**. De inhoudsopgave staat in [SUMMARY.md](SUMMARY.md). De beschrijving van de indeling, het genereren en het publiceren staat in [ontwikkelaars/beheer/documentatie.md](ontwikkelaars/beheer/documentatie.md).

| Map | Groep in de zijbalk |
|---|---|
| `documentatie/` | Documentatie |
| `ontwikkelaars/` | Ontwikkelaars (technisch, schrapbaar) |
| `internal/e-masspost/docs/` | Naslag bpost (submodule) |
| `changelog/` | Changelog (kopie van `CHANGELOG.md`) |
| `projectdossier/` | Projectdossier |

Gegenereerd: `ontwikkelaars/api/openapi.yaml` (`npm run docs:api`, ook `npm run docs:build`). De library-referentie staat in de webapp-repository (ADR 0011).
