/**
 * SHA-256 of a file, as lowercase hex. Uses Web Crypto (browser and Node 20+).
 * @param bytes The file contents.
 * @returns 64 hex characters.
 */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
