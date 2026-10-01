# docs/

Deze map wordt door GitBook (Git Sync, branch `docs`) gelezen als vier tabbladen. De beschrijving van de indeling, het genereren en het publiceren staat in [ontwikkelaars/beheer/documentatie.md](ontwikkelaars/beheer/documentatie.md).

| Map | Tab |
|---|---|
| `documentatie/` | Documentatie |
| `ontwikkelaars/` | Ontwikkelaars (technisch, schrapbaar) |
| `internal/e-masspost/docs/` | Naslag bpost (submodule) |
| `changelog/` | Changelog (kopie van `CHANGELOG.md`) |

Gegenereerd: `ontwikkelaars/library/` (`npm run docs:code`) en `ontwikkelaars/api/openapi.yaml` (`npm run docs:api`). Beide: `npm run docs:build`.
