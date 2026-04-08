export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
}
