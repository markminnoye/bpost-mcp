// scripts/seed-demo-tenant.ts
import { randomBytes } from 'crypto'
import { db } from '../src/lib/db/client'
import { tenants, bpostCredentials, apiTokens } from '../src/lib/db/schema'
import { encrypt, hashToken } from '../src/lib/crypto'

async function seed() {
  const encKey = process.env.ENCRYPTION_KEY
  if (!encKey) throw new Error('ENCRYPTION_KEY env var is required')

  const username = process.env.SEED_BPOST_USERNAME
  const password = process.env.SEED_BPOST_PASSWORD
  if (!username || !password) {
    throw new Error('SEED_BPOST_USERNAME and SEED_BPOST_PASSWORD must be set')
  }

  console.log('Seeding internal demo tenant (customer #0)...')

  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Internal Demo (Customer #0)' })
    .returning()

  const { ciphertext, iv } = encrypt(password, encKey)
  await db.insert(bpostCredentials).values({
    tenantId: tenant.id,
    username,
    passwordEncrypted: ciphertext,
    passwordIv: iv,
  })

  const rawToken = `bpost_${randomBytes(32).toString('hex')}`
  const tokenHash = hashToken(rawToken)
  await db.insert(apiTokens).values({
    tenantId: tenant.id,
    tokenHash,
    label: 'demo-seed-token',
  })

  console.log(`\n✅ Demo tenant seeded`)
  console.log(`   Tenant ID : ${tenant.id}`)
  console.log(`   Bearer token: ${rawToken}`)
  console.log('\n⚠️  Copy this token now — it is not stored in plaintext and cannot be recovered.\n')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
