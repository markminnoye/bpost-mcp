# BPost MCP Service: Initial Design & Brainstorming Log

## 1. Understanding Summary
- **What is being built:** An MCP service acting as a secure interface to an existing BPost service for announcing batch processes of sorting and delivering post packages (letters).
- **Why it is being built:** To allow an AI agent, via MCP, to programmatically interact with BPost batch APIs using structured data based on official API documentation and examples.
- **Who it is for:** AI agents utilizing the final service, and currently, the developer preparing a standardized environment for an agent to build the service.
- **Key constraints:** The architecture must enforce strict credential/secret management, support reliable error handling and logging for handling batch payloads, and safely segment sensitive data or documents.
- **Explicit non-goals:** We are not building a frontend UI. At this stage, we are establishing the environment and folder layout, leaving the actual implementation code for the future.

## 2. Key Assumptions
- Initial development will commence after reference PDFs and JSON/XML sample input/output files have been collected into `docs/`.
- The service will rely heavily on robust handling and validation of JSON/XML payloads representing letter batches.
- We require a clear separation between context/reference definitions (used to guide the AI) and the actual executable application source.

## 3. Decision Log
1. **Goal:** Building an MCP wrapper for a BPost batch service.
2. **Project Design:** `@docs/internal/project-design.md` for architectural decisions, constraints, and data flow.
3. **Vercel MCP Docs:** [Deploy MCP Servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
4. **Vercel Next.js Template:** [MCP with Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
5. **Official MCP Examples:** [Claude AI MCP Servers](https://github.com/anthropics/claude-ai-mcp) — reference for tool definitions.
6. **External Specs:** Read PDF specs inside `docs/external/` to understand BPost constraints before writing validation.
10. **Integration Strategy:** **Langflow** is identified as a primary candidate for an orchestration endpoint. The MCP should be designed to be easily consumed by Langflow's tool-calling components (clear parameter descriptions, standard JSON outputs).

## 4. Final Folder Structure (Vercel/TypeScript)
```text
/bpost-mcp
├── docs/                      # Agent Context Brain 
│   ├── external/              # Raw BPost PDFs & Developer Guides 
│   ├── internal/              # Code-related documentation (like this file)
│   └── samples/               # Mock payloads (JSON/XML) used for tests & examples
├── src/                       # Vercel Application Source Code
│   ├── app/                   # Next.js / Vercel API routes (e.g., /api/mcp)
│   ├── client/                # HTTP fetch wrappers for communicating securely with BPost
│   └── schemas/               # Zod definitions ensuring valid letter batches
├── tests/                     # Unit & Integration tests for batch announcement
├── .env.local                 # Secret API keys and endpoints for BPost
├── AGENTS.md                  # Compact instructions and routing for AI Agents
└── package.json               # Node dependency map
```

## 5. Data Flow & Error Handling Strategy
1. **Invocation:** An agent calls the MCP tool (e.g., `announce_mail_batch`) with a JSON payload constructed from provided samples.
2. **Validation (`src/schemas`):** Validated against a strict schema (e.g., Zod) to prevent malformed requests reaching BPost. Returns exact field-level errors to the agent on failure so it can auto-correct.
3. **Execution (`src/client`):** Authenticates and dispatches payload to BPost API.
4. **Response:** Catch BPost-specific errors (400/500s) gracefully, parse the specific error message, and return it cleanly to the invoking agent rather than crashing the MCP server.

## Decision: XML Parsing Library

**Library:** `fast-xml-parser` v4+
**Reason:** Pure TypeScript, no native deps, supports attribute parsing (`ignoreAttributes: false`),
handles ISO-8859-1 encoding used by BPost XSDs, and produces predictable JS objects.
**Used in:** `src/lib/xml.ts` (singleton builder + parser configured for BPost format)
