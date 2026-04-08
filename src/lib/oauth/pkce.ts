import { createHash } from 'crypto';

/**
 * Verify PKCE S256: SHA256(code_verifier) base64url-encoded === code_challenge
 */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}
