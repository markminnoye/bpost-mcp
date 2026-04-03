// scripts/seed-demo-tenant.ts
import { randomBytes } from 'crypto'
import { db } from '../src/lib/db/client'
import { tenants, bpostCredentials, apiTokens, users } from '../src/lib/db/schema'
import { encrypt, hashToken } from '../src/lib/crypto'

async function seed() {
  const encKey = process.env.ENCRYPTION_KEY
  if (!encKey) throw new Error('ENCRYPTION_KEY env var is required')

  const username = process.env.SEED_BPOST_USERNAME
  const password = process.env.SEED_BPOST_PASSWORD
  const customerNumber = process.env.SEED_BPOST_CUSTOMER_NUMBER
  const accountId = process.env.SEED_BPOST_ACCOUNT_ID
  if (!username || !password || !customerNumber || !accountId) {
    throw new Error('SEED_BPOST_USERNAME, SEED_BPOST_PASSWORD, SEED_BPOST_CUSTOMER_NUMBER and SEED_BPOST_ACCOUNT_ID must be set')
  }

  console.log('Seeding internal demo tenant (customer #0)...')

  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Internal Demo (Customer #0)' })
    .returning()

  const { ciphertext: encrypted, iv } = encrypt(password, encKey)
  await db.insert(bpostCredentials).values({
    tenantId: tenant.id,
    username,
    passwordEncrypted: encrypted,
    passwordIv: iv,
    customerNumber,
    accountId,
  })

  // Create a test user for dashboard access if email is provided
  const testEmail = process.env.SEED_USER_EMAIL || 'test@example.com'
  console.log(`Creating test user: ${testEmail}`)
  
  await db
    .insert(users)
    .values({
      name: 'Demo Admin',
      email: testEmail,
      tenantId: tenant.id,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { tenantId: tenant.id },
    })
    .returning()

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
