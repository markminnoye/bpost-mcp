import { describe, it, expect } from 'vitest';
import { verifyPkceS256 } from '@/lib/oauth/pkce';

describe('PKCE S256 verification', () => {
  it('verifies a valid code_verifier against code_challenge', () => {
    // Known test vector: verifier → SHA256 → base64url
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it('rejects an invalid code_verifier', () => {
    const verifier = 'wrong-verifier';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    expect(verifyPkceS256(verifier, challenge)).toBe(false);
  });
});
