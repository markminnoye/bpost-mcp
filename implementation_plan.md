# BPost Skills Library Migration & Integration (Backup)

Migrate internal BPost documentation into a standalone, public GitHub repository formatted as distributable **AI Agent Skills** (.zip). This separates knowledge management from the MCP server logic and allows BPost customers to use the same protocol expertise in their own workflows.

## User Review Required

> [!IMPORTANT]
> **Submodule Shift:** Once migrated, the documentation in `bpost-mcp/docs/internal/bpost-guide` will be **deleted** and replaced by a git submodule at `bpost-mcp/docs/internal/epost-masspost`.
> **Public Visibility:** The new repository `markminnoye/bpost-epostmasspost-skills` is public. Content should be scrubbed of any internal-only secrets (none identified so far).

## Proposed Changes

### [NEW] Repository: [bpost-epostmasspost-skills](https://github.com/markminnoye/bpost-epostmasspost-skills)

#### Phase 1: Repository Structure
- **LICENSE & README.md**: Define usage and skill catalogue.
- **`reference/`**: Store raw PDFs, XSDs, and screenshots (excluded from skill ZIPs).
- **`skills/epost-masspost-protocol/`**: The primary knowledge skill.

#### Phase 2: Documentation Migration
- Move `docs/internal/bpost-guide/*` (from `bpost-mcp`) → `skills/epost-masspost-protocol/`.
- [NEW] `SKILL.md`: Standard metadata for agent ingestion.
- [NEW] `index.md`: Agent-optimized entry point for protocol knowledge.

#### Phase 3: Automation (GitHub Actions)
- [NEW] `.github/workflows/build-claude-skill.yml`: Automatically builds versioned ZIP releases for Claude.ai on git tags (`v*`).

---

### [MODIFY] Repository: [bpost-mcp](https://github.com/markminnoye/bpost-mcp)

#### Phase 4: Integration
- **Git Submodule**: Add `bpost-epostmasspost-skills` at `docs/internal/epost-masspost`.
- [MODIFY] **AGENTS.md**: Update routing to point to the submodule path.
- [DELETE] **Old Documentation**: Remove `docs/internal/bpost-guide/` after verification.

## Open Questions

- Should we include the `status_codes.xls` as a raw resource in the new repo's `reference/xsd/` folder for completeness?

## Verification Plan

### Automated Tests
- `git submodule status` to verify successful linking.
- `gh release list` on the new repo to verify ZIP builds (once tagged).

### Manual Verification
- Verify that `AGENTS.md` correctly routes internal agents to the new submodule path.
- Ensure all relative links within the migrated documentation are still valid.
