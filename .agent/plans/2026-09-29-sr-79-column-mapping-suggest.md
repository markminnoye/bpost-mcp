# SR-79 — API: kolom-mapping suggestie

Linear: [SR-79](https://linear.app/sonicrocket/issue/SR-79/api-kolom-mapping-suggestie-heuristics-optionele-ai)

API/library eerst. Geen UI. Suggestie wordt nooit stil toegepast.

## Checklist

- [x] `suggestColumnMapping` in `src/core/masspost/` (geen Next/AI-imports)
- [x] Contrapunt-headers → exact `CONTRAPUNT_EXPORT_COLUMN_MAPPING`, high, `needsAi: false`
- [x] Synoniemen NL/FR/EN; `needsAi` alleen bij incompleet of confidence low
- [x] Export via `src/core/masspost/index.ts`
- [x] AI-adapter + `POST /api/masspost/suggest-mapping` + env (fail-closed, headers only, Zod)
- [x] Unit tests + route-tests met gemockte AI
- [x] Sectie in `docs/internal/masspost-library.md`

## Bewust niet

- Web UI, MCP-tools, structured straat/huisnr-split
- Gemaskeerde sample-cellen naar het model
- Silent auto-apply in `mapRows` / pipeline

## Status: Klaar voor review

Implementatie op branch `mark/sr-79-api-kolom-mapping-suggestie-heuristics-optionele-ai`. Linear-status niet gewijzigd.
