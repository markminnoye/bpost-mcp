// src/core/masspost/index.ts
// Public API surface of the masspost library. Framework-agnostic — no Next.js, Redis or DB
// dependencies. Consumed today by scripts and the web POC (src/app/(tools)/masspost/poc); could be
// consumed by an MCP tool later without any change here. Browser code imports the modules it
// needs directly (excel, mapping, suggest-mapping, format-check): this barrel also pulls in FTP.

export * from './excel'
export * from './mapping'
export * from './box-keywords'
export * from './suggest-mapping'
export * from './build-request'
export * from './validate'
export * from './format-check'
export * from './printer-export'
export * from './aft-export'
export * from './charset'
export * from './credentials'
export * from './pipeline'
export * from './transport/http'
export * from './transport/ftp'
export * from './parse-response'
