# bpost e-MassPost Skills Library

![Beta](https://img.shields.io/badge/Status-Beta-orange)
[![Latest Release](https://img.shields.io/github/v/release/markminnoye/bpost-e-masspost-skills?label=Download&logo=github)](https://github.com/markminnoye/bpost-e-masspost-skills/releases/latest)

AI agent skill library for the **BPost e-MassPost Mail ID** data exchange protocol.
Distributable as versioned ZIP files for Claude, Gemini, and other AI agent platforms.

## Feedback & Issues

This library is currently in **Beta**. If you or your AI agent encounters any errors, missing XML tags, or validation issues:
- [🐛 Report a Bug](https://github.com/markminnoye/bpost-e-masspost-skills/issues/new/choose)
- [✨ Request a Feature](https://github.com/markminnoye/bpost-e-masspost-skills/issues/new/choose)

## Skills

| Skill | Description | Status |
|---|---|---|
| [e-masspost-protocol](skills/e-masspost-protocol/) | Core protocol: schemas, flows, barcodes, error codes, transport | ✅ Available |
| [bpost-address-proofing](skills/bpost-address-proofing/) | Mailops Address Formatting & Validation REST (S42, max 100, no person PII) | ✅ Available |

## Install (Claude.ai)

1. Download the [Latest Release ZIP](https://github.com/markminnoye/bpost-e-masspost-skills/releases/latest) (select `e-masspost-bundle-claude-vX.X.X.zip`)
2. Go to `claude.ai/customize/skills` → Upload ZIP
3. Enable the skill

## Versioning

This repo uses semantic versioning (`vMAJOR.MINOR.PATCH`). Each GitHub Release
automatically builds and attaches the skill ZIPs via GitHub Actions.

## Reference Materials

The `reference/` folder contains the original BPost technical documentation
(PDF, screenshots, XSD schemas, Address Proofing API manual) for human and
developer use. These files are **not included** in skill ZIPs.

Address Proofing is **not** Mail ID/OptiAddress. Routing:
`skills/e-masspost-protocol/reference/address-validation-products.md`.

## License

See [LICENSE](LICENSE).
