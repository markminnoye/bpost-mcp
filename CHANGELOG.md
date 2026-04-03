# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-04-03

### Changed
- **Phase 1 Complete**: All action sub-schemas (`DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`, `MailingCreate`, `MailingCheck`, `MailingDelete`, `MailingReuse`) fully implemented from XSD sources. Response schemas (`deposit-response.ts`, `mailing-response.ts`) added.
- **AGENTS.md**: Updated active work section to reflect Phase 1 completion; removed in-progress implementation notes.
- **next-env.d.ts**: Updated route types import path to `.next/dev/types/routes.d.ts` (Next.js tooling update, auto-generated).
- **Claude settings**: Accumulated session permissions in `.claude/settings.local.json` for local tooling operations.

---

## [1.1.0] - 2026-03-29

### Changed
- **Submodule Upgrade (v1.1.0)**: Standardized the documentation library with a full XSD-compliant audit (BUG-001).
- **Naming Unification**: Renamed and unified all technical references to **e-MassPost** for consistency across the codebase and Skills Library.

### Added
- **Build Automation**: Integrated automated version management for skill bundles.
- **English Localization**: Fully localized the protocol documentation and build instructions.
- **Formal Audit Record**: Added systematic audit log and agent feedback loops to `AGENTS.md`.

## [1.0.0] - 2026-03-27

### Added
- Initial project structure with Vercel/TypeScript/Zod.
- Integrated `e-masspost-skills` library as a git submodule.
- Migrated legacy BPost documentation to the Skills Library format.
- Added Mermaid diagrams for technical protocol flows.

