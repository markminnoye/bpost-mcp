# Design: bpost e-MassPost Skills Library

**Date:** 2026-03-28  
**Status:** Approved — ready for implementation  
**Author:** Brainstorming session (user + AI)

---

## Understanding Summary

- **What:** A standalone GitHub repository (`bpost-e-masspost-skills`) that packages BPost e-MassPost documentation as distributable AI agent skills.
- **Why:** Allow BPost customers and AI orchestration workflows (Langflow, etc.) to understand and eventually automate the Mail ID protocol — starting with pure knowledge, evolving into active tools.
- **Who:** Primary consumers are AI orchestration workflows (Langflow) and end users via chatbot. Secondary: developers building agents.
- **Phase A (now):** Pure knowledge skills. No code execution. Distributable as versioned ZIP files.
- **Phase B (later):** Add `scripts/` to skills for active capabilities (HTTP/FTP upload, validation). MCP server. Possibly AstraDB for semantic search.
- **Non-goals (Phase A):** No tool/action capabilities, no MCP server, no npm publishing, no AstraDB.

---

## Assumptions

1. Customers have Claude.ai (any plan) or Gemini with skills support.
2. GitHub is acceptable as the distribution platform.
3. The existing `docs/internal/bpost-guide/` content is the authoritative source for the protocol skill — minimal rework needed beyond reorganization.
4. The `bpost-mcp` project will reference the skill repo via git submodule.
5. Raw `.xsd` files stay with `bpost-mcp` (for MCP server use). The `-xsd.md` files in schemas already embed XSD content for the knowledge skill.
6. PDF, screenshots, and binary XLS files are kept as `reference/` in the repo but excluded from all skill ZIPs.

---

## Decision Log

| # | Decision | Alternatives Considered | Why Chosen |
|---|---|---|---|
| 1 | Rename `bpost-guide` → `e-masspost` | `mail-id-data-exchange`, `bpost-mail-id` | Matches customer-facing portal name (e-MassPost) |
| 2 | Phase A = pure knowledge (no tools) | Knowledge + lookup tools | Fastest to ship, easiest to share, zero infrastructure |
| 3 | Separate GitHub repo for the skill library | Mono-repo with packaged releases | Clean separation, publicly shareable without exposing MCP code |
| 4 | `SKILL.md` format (agentskills.io) | Plain markdown, custom format | Open standard referenced by Anthropic; cross-platform potential |
| 5 | Versioned GitHub tagged releases | Auto-update via URL, manual redistribution | Auditable, customers pin versions, no surprise updates |
| 6 | Multi-skill repo with `skills/` directory | One repo per skill | Mirrors Anthropic's own structure; accommodates future skills (tips, automation) |
| 7 | Individual ZIPs + bundle ZIP | Individual only | Customers choose: one skill or everything. Bundle uses progressive disclosure — Claude doesn't load all content at once. |
| 8 | Docs at skill root (no `knowledge/` subfolder) | `knowledge/` wrapper folder | Matches Claude's official skill examples; simpler, no unnecessary nesting |
| 9 | GitHub Actions file naming: `build-claude-skill.yml` | `build-skill.yml`, `build-skill-claude.yml` | Clear per-platform intent; easy to extend (add `build-gemini-skill.yml`, etc.) |
| 10 | ZIP excludes `.github/`, `reference/`, raw binaries | Include everything | Skills should contain only agent-readable content |

---

## Final Design

### Repository

**Name:** `bpost-e-masspost-skills`  
**Visibility:** Public (shareable with customers)  
**URL:** `https://github.com/{owner}/bpost-e-masspost-skills`

### Structure

```
bpost-e-masspost-skills/
├── README.md                           ← repo overview + skill catalogue + install guide
├── LICENSE
│
├── reference/                          ← raw materials — never included in ZIPs
│   ├── Mail-ID_Data_Exchange_Technical_Guide.pdf
│   ├── screenshots/
│   └── xsd/
│       ├── DepositRequest.xsd
│       ├── DepositResponse.xsd
│       ├── MailingRequest.xsd
│       ├── MailingResponse.xsd
│       └── RequestAck.xsd
│
├── skills/
│   ├── e-masspost-protocol/        ← SKILL 1: core Mail ID protocol
│   │   ├── SKILL.md
│   │   ├── index.md                    ← agent navigation (start here)
│   │   ├── schemas/
│   │   ├── flows/
│   │   ├── errors/
│   │   ├── barcode/
│   │   ├── reference/
│   │   └── transport/
│   │
│   ├── e-masspost-tips/            ← SKILL 2: do's & don'ts (future)
│   │   ├── SKILL.md
│   │   └── index.md + content...
│   │
│   └── epost-browser-automation/       ← SKILL 3: browser workflow (future)
│       ├── SKILL.md
│       └── index.md + content...
│
└── .github/
    └── workflows/
        └── build-claude-skill.yml
```

### SKILL.md — Protocol Skill

```markdown
---
name: bpost-ePost-MassPost
description: BPost e-MassPost Mail ID data exchange protocol. Use when building deposit/mailing files, looking up MPW/MID error codes, understanding barcode structure, or implementing HTTP/FTP transfers to bpost.
license: See LICENSE
---

# BPost e-MassPost Mail ID — Knowledge Skill

This skill provides complete knowledge of the BPost Mail ID Data Exchange protocol
used by the e-MassPost platform.

## When to Use This Skill
- Building or validating a DepositRequest or MailingRequest XML/TXT file
- Looking up an error code (MPW-xxxx or MID-xxxx)
- Understanding barcode structure or Code 128 encoding
- Implementing HTTP(S) or FTP/FTPS file transfer to filetransfer.bpost.be
- Answering end-user questions about the e-MassPost workflow

## Start Here
Always read `index.md` first. It maps every task to the exact file needed.
```

### SKILL.md — Bundle Dispatcher

```markdown
---
name: bpost-ePost-MassPost Complete
description: Complete BPost e-MassPost suite: protocol specs, error codes, barcodes, HTTP/FTP transport, user do's & don'ts, and browser automation. Use for anything e-MassPost related.
license: See LICENSE
---

# BPost e-MassPost — Complete Skills Suite

## Routing Guide

| When the question is about... | Read first |
|---|---|
| Protocol, files, error codes, barcodes, transport | `e-masspost-protocol/index.md` |
| Best practices, do's & don'ts, common mistakes | `e-masspost-tips/index.md` |
| Automating the e-MassPost web portal | `epost-browser-automation/index.md` |

Always start with the relevant index — it routes precisely to the right file.
```

### GitHub Actions Workflow

**File:** `.github/workflows/build-claude-skill.yml`  
**Trigger:** Push of a version tag (`v*`)

```yaml
name: Build Claude Skills

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build individual skill ZIPs
        run: |
          mkdir -p dist
          for skill_dir in skills/*/; do
            skill_name=$(basename "$skill_dir")
            zip -r "dist/${skill_name}-claude-${{ github.ref_name }}.zip" \
              "$skill_dir" \
              --exclude "*.git*"
          done

      - name: Build bundle ZIP
        run: |
          mkdir -p bundle-tmp/e-masspost-bundle
          cp skills/e-masspost-protocol/* bundle-tmp/e-masspost-bundle/e-masspost-protocol/ -r
          cp skills/e-masspost-tips/* bundle-tmp/e-masspost-bundle/e-masspost-tips/ -r
          cp skills/epost-browser-automation/* bundle-tmp/e-masspost-bundle/epost-browser-automation/ -r
          # Remove individual SKILL.md files; bundle has its own
          rm -f bundle-tmp/e-masspost-bundle/*/SKILL.md
          # Add bundle dispatcher SKILL.md (from .github/bundle-skill.md)
          cp .github/bundle-skill.md bundle-tmp/e-masspost-bundle/SKILL.md
          cd bundle-tmp
          zip -r "../dist/e-masspost-bundle-claude-${{ github.ref_name }}.zip" \
            e-masspost-bundle/ --exclude "*.git*"

      - name: Attach to GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*.zip
          generate_release_notes: true
```

**Release artifacts per tag:**
```
e-masspost-protocol-claude-v1.0.0.zip
e-masspost-tips-claude-v1.0.0.zip
epost-browser-automation-claude-v1.0.0.zip
e-masspost-bundle-claude-v1.0.0.zip
```

### Customer Install (Claude.ai)

1. Go to the GitHub Releases page
2. Download the desired ZIP (`protocol` only, or `bundle` for everything)
3. Go to `claude.ai/customize/skills` → Upload ZIP
4. Enable the skill
5. Done — Claude will invoke it automatically on relevant questions

### Integration with bpost-mcp (Git Submodule)

```bash
# Run once in bpost-mcp:
git submodule add https://github.com/{owner}/bpost-e-masspost-skills \
  docs/internal/e-masspost

# Update AGENTS.md pointer from:
#   @docs/internal/bpost-guide/index.md
# to:
#   @docs/internal/e-masspost/skills/e-masspost-protocol/index.md
```

When BPost updates their spec:
1. Update docs in `skills/e-masspost-protocol/` in the skill repo
2. Tag a new release (`v1.1.0`) — GitHub Action builds and publishes ZIPs automatically
3. In `bpost-mcp`: `git submodule update --remote` → commit the ref bump

---

## Phase B Preview (Not in Scope Now)

When Phase B begins, each skill can grow independently by adding `scripts/` and `templates/` folders. The same repo, same ZIP packaging, same install process — just richer skills.

The MCP server (`bpost-mcp`) will expose action tools (upload, validate, submit) that complement the knowledge skills.
