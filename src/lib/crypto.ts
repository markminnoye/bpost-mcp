// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12  // GCM standard IV length
const TAG_BYTES = 16 // GCM auth tag length

export function encrypt(
  plaintext: string,
  keyBase64: string,
): { ciphertext: string; iv: string } {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Append auth tag to ciphertext so both travel together
  const combined = Buffer.concat([encrypted, authTag])
  return {
    ciphertext: combined.toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decrypt(
  ciphertext: string,
  iv: string,
  keyBase64: string,
): string {
  const key = Buffer.from(keyBase64, 'base64')
  const ivBuf = Buffer.from(iv, 'base64')
  const combined = Buffer.from(ciphertext, 'base64')
  const authTag = combined.subarray(combined.length - TAG_BYTES)
  const encrypted = combined.subarray(0, combined.length - TAG_BYTES)
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
