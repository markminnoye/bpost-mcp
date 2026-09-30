// src/core/masspost/index.ts
// Public API surface of the masspost library. Framework-agnostic — no Next.js, Redis or DB
// dependencies. Consumed today by the web app (src/app/(tools)/masspost); could be consumed by
// an MCP tool later without any change here.

export * from './excel'
export * from './mapping'
export * from './suggest-mapping'
export * from './build-request'
export * from './validate'
export * from './charset'
export * from './credentials'
export * from './pipeline'
export * from './transport/http'
export * from './transport/ftp'
export * from './parse-response'
