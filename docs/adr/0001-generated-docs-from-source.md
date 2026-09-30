# ADR 0001: Generate docs from source

## Status

Accepted

## Context

Code comments and HTTP contracts drift when they are written twice. The docs should stay readable in GitBook (Git Sync of Markdown plus an OpenAPI file) and in other readers (Mintlify, Redocly, Scalar) without hosting a separate docs app.

## Decision

- Public exports are documented with TSDoc. TypeDoc writes Markdown from the library entry point.
- HTTP contracts are Zod schemas the handler already parses. OpenAPI 3.1 is generated from those schemas only.
- A new route is specified (Zod contract) and approved before it is implemented.
- Generated files are committed. A check fails when they do not match the source.
- Decisions that are awkward to reverse go in `docs/adr/`, copied from `template.md`.

## Consequences

Routes that do not parse a Zod schema are absent from the OpenAPI file until they get one. Regenerating docs is a separate npm script, not part of the application build.
