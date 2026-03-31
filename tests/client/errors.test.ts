// tests/client/errors.test.ts
import { describe, it, expect } from 'vitest'
import { parseBpostError, BpostError } from '@/client/errors'

describe('parseBpostError', () => {
  it('parses an MPW error code into a structured error', () => {
    const err = parseBpostError('MPW-4010', 'Invalid sender')
    expect(err).toBeInstanceOf(BpostError)
    expect(err.code).toBe('MPW-4010')
    expect(err.message).toBe('Invalid sender')
    expect(err.isRetryable).toBe(false)
  })

  it('marks network-level errors as retryable', () => {
    const err = parseBpostError('NETWORK_TIMEOUT', 'Request timed out')
    expect(err.isRetryable).toBe(true)
  })

  it('serializes cleanly for MCP tool response', () => {
    const err = parseBpostError('MPW-4010', 'Invalid sender')
    const json = err.toMcpError()
    expect(json).toHaveProperty('code', 'MPW-4010')
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('retryable', false)
  })
})
