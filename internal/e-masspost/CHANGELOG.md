# Changelog - BPost e-MassPost Skills Library

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **GitBook**: `docs/` is now the single source for the protocol documentation, published via GitBook Git Sync (`gitbook-docs.yaml`, `docs/SUMMARY.md`).
- **Skill `bpost-address-proofing`:** Mailops Address Formatting & Validation REST/SOAP (CEN/UPU S42). Privacy rule: never send person names or other PII of natural persons; company name allowed. AddressBlockLines forbidden.
- **Protocol routing:** `reference/address-validation-products.md` plus Comp ↔ S42 table and Belgian label rules in `addressing-rules.md`. OptiAddress flows unchanged (different product).
- **Field findings** (`docs/reference/field-findings.md`): live Contrapunt observations (2026-09) — FTP for automation vs interactive HTTP/SSO, OptiAddress corrections as `7001`/`compCorrection`, protocol `0200`, mode limits vs 500-address commercial minimum, recommended Check→Create flow.
- **Reference materials:** vendor Address Formatting & Validation API Manual v1.7 (`reference/bpost_Address_Formatting_and_Validation_API_Manual_v1.7/`) and e-MassPost portal code-list snapshot (`reference/portal-code-lists/`, 2026-09-28).

### Changed
- **Build**: `build-skills.yml` builds the skill ZIP from `docs/` (`docs/README.md` becomes `index.md`) plus `skills/e-masspost-protocol/SKILL.md`. Protocol content moved from `skills/e-masspost-protocol/` to `docs/`.
- Removed the empty GitBook export scaffolding (`untitled/`, root `SUMMARY.md`).
- **HTTP / FTP / Opti / MailingResponse / MID codes**: cross-links and warnings aligned with field findings (HTTP not a machine API; live `7001` without `MID-` prefix; `<Suggestions>` optional).

## [v1.1.0] - 2026-03-29

### Added
- **Build Automation**: Integrated GitHub Actions pipeline for automatic version injection into Claude Skill bundles and automated releases.
- **English Localization**: Translated the technical guide and installation instructions from Dutch to English for international consistency.

### Fixed
- **Documentation Audit (BUG-001)**: Completed a comprehensive audit and reached 100% alignment with BPost XSD schemas.
  - Standardized all `Context`, `Header`, and `Item` attributes to strictly lowercase (e.g., `distributionOffice`, `icti`, `isec`).
  - Corrected legacy field names (e.g., `fieldToPrint1-3`) to modern XSD-compliant attributes.
  - Re-vetted all XML and TXT payload examples for technical accuracy.
- **Naming Standardization**: Unified the repository and naming convention to **e-MassPost** across all documentation, metadata, and routing guides.
- **YAML Frontmatter**: Resolved parsing errors in skill descriptions.

## [v1.0.0] - 2026-03-27

### Added
- Initial release of the agent-optimized BPost e-MassPost technical guide.
- Added Mermaid diagrams for technical protocol flows.
- Added BETA badging and agent feedback loop integration.
- Configured GitHub issue templates for bug reporting (BUG-001).

