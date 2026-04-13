import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/oauth/verify-token'
import { extractBearerToken as extractBearerTokenFromRequest } from '@/lib/auth/extract-token'

/**
 * Policy that controls which auth methods are accepted for a given route.
 */
export interface AuthPolicy {
  /** Whether to accept an OAuth/OIDC bearer token in the Authorization header. */
  allowBearer: boolean
  /** Whether to accept a NextAuth session cookie (browser/UI calls on same origin). */
  allowSession: boolean
}

/**
 * Uniform auth context returned by resolveRequestAuth, regardless of which
 * auth method succeeded. All business logic consumes only this type.
 */
export interface RequestAuthContext {
  tenantId: string
  userId?: string
  clientId?: string
  authMethod: 'oauth-bearer' | 'session-cookie'
}

/**
 * Authentication resolution failed — provides a machine-readable reason.
 */
export interface AuthResolutionError {
  status: 401 | 403
  reason:
    | 'missing_auth'
    | 'invalid_bearer'
    | 'invalid_session'
    | 'missing_tenant'
}

/**
 * Result of resolveRequestAuth — either a valid context or a resolution error.
 */
export type AuthResolutionResult =
  | { success: true; context: RequestAuthContext }
  | { success: false; error: AuthResolutionError }

/**
 * Resolves the authenticated tenant (and optional user) from a request,
 * following the policy supplied. Tries auth methods in order of preference
 * when multiple are available.
 *
 * @param request  - The incoming Next.js/Next.js server request.
 * @param policy   - Route-level policy specifying which auth methods are allowed.
 * @param options - Optional overrides for bearer token extraction and verification
 *                  (useful in test setups where you want to inject a pre-verified token).
 */
export async function resolveRequestAuth(
  request: NextRequest,
  policy: AuthPolicy,
  options?: {
    extractBearerOverride?: (req: NextRequest) => string | null
    verifyTokenOverride?: typeof verifyToken
  },
): Promise<AuthResolutionResult> {
  const extractBearer = options?.extractBearerOverride ?? extractBearerTokenFromRequest
  const verifyTokenFn = options?.verifyTokenOverride ?? verifyToken

  // ── 1. Bearer path ──────────────────────────────────────────────────────
  if (policy.allowBearer) {
    const token = extractBearer(request)
    if (token) {
      const authInfo = await verifyTokenFn(request as unknown as Request, token)
      if (authInfo?.extra?.tenantId) {
        return {
          success: true,
          context: {
            tenantId: authInfo.extra.tenantId as string,
            userId: authInfo.extra.userId as string | undefined,
            clientId: authInfo.clientId ?? undefined,
            authMethod: 'oauth-bearer',
          },
        }
      }
      // Bearer present but invalid/tenantless
      return {
        success: false,
        error: { status: 401, reason: 'invalid_bearer' },
      }
    }
  }

  // ── 2. Session cookie path (NextAuth) ──────────────────────────────────
  if (policy.allowSession) {
    const session = await auth()
    if (session?.user?.tenantId) {
      return {
        success: true,
        context: {
          tenantId: session.user.tenantId as string,
          userId: session.user.id as string | undefined,
          clientId: undefined,
          authMethod: 'session-cookie',
        },
      }
    }
    // Session present but no tenant linked
    if (session?.user) {
      return {
        success: false,
        error: { status: 403, reason: 'missing_tenant' },
      }
    }
  }

  // ── 3. No valid auth found ──────────────────────────────────────────────
  if (policy.allowBearer && !policy.allowSession) {
    return { success: false, error: { status: 401, reason: 'missing_auth' } }
  }
  if (!policy.allowBearer && policy.allowSession) {
    return { success: false, error: { status: 401, reason: 'invalid_session' } }
  }
  return { success: false, error: { status: 401, reason: 'missing_auth' } }
}

/**
 * Convenience helper for routes that want to throw on auth failure
 * rather than returning a result. Use when you want a clean throw pattern.
 *
 * @throws AuthResolutionError (as Error) when resolution fails.
 */
export async function requireRequestAuth(
  request: NextRequest,
  policy: AuthPolicy,
  options?: {
    extractBearerOverride?: (req: NextRequest) => string | null
    verifyTokenOverride?: typeof verifyToken
  },
): Promise<RequestAuthContext> {
  const result = await resolveRequestAuth(request, policy, options)
  if (!result.success) {
    const err = new Error(`Auth failed: ${result.error.reason}`)
    ;(err as unknown as AuthResolutionError & { status: number }).status = result.error.status
    throw err
  }
  return result.context
}
