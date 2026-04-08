type McpErrorResponse = {
  content: [{ type: 'text'; text: string }]
  isError: true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireTenantId(extra: any): string | McpErrorResponse {
  const tenantId = extra?.authInfo?.extra?.tenantId as string | undefined
  if (!tenantId) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
      isError: true as const,
    }
  }
  return tenantId
}
