# Issue #15: MCP Knowledge Transparency Page

## Status: Complete

## Goal

Provide a static, public `/reference` page that shows all AI-facing MCP metadata at build time so stakeholders can review:

- server name/version/description/icon
- system instructions
- tools and parameter descriptions
- resources and prompts when present

## Decisions

- Build-time extraction via `scripts/extract-tool-metadata.ts`
- Generated artifact: `src/generated/tool-registry.json`
- Read-only page with readable view + JSON toggle per tool
- Generic auto-discovery for `registerTool`, `registerResource`, `registerPrompt`

## Completed Checklist

- [x] Add generic extractor script using TypeScript AST
- [x] Add shared registry types (`src/lib/mcp/tool-registry-types.ts`)
- [x] Wire build hook (`prebuild`) and ignore generated folder
- [x] Build `/reference` page and JSON toggle component
- [x] Add styles in `globals.css`
- [x] Add extractor + page smoke tests
- [x] Validate with `prebuild`, `vitest`, `eslint`, and `tsc --noEmit`

## Notes

- Current codebase has no registered MCP resources/prompts yet; arrays are generated empty and sections are hidden.
- New tools/resources/prompts are picked up automatically on next build.
