// src/client/errors.ts

/** Non-retryable BPost protocol errors (MPW / MID prefix) */
const PROTOCOL_ERROR_PATTERN = /^(MPW|MID)-\d+$/

export class BpostError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly isRetryable: boolean,
  ) {
    super(message)
    this.name = 'BpostError'
  }

  toMcpError() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.isRetryable,
    }
  }
}

export function parseBpostError(code: string, message: string): BpostError {
  const isRetryable = !PROTOCOL_ERROR_PATTERN.test(code)
  return new BpostError(code, message, isRetryable)
}
