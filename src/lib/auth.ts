// src/lib/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db/client'
import { users, accounts, sessions, verificationTokens, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      // Check if user exists and has a tenant
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)

      if (existingUser && !existingUser.tenantId) {
        // Create a new tenant for the existing user
        const [newTenant] = await db
          .insert(tenants)
          .values({
            name: `${user.name || user.email}'s Tenant`,
          })
          .returning()

        // Link the user to the new tenant
        await db
          .update(users)
          .set({ tenantId: newTenant.id })
          .where(eq(users.id, existingUser.id))
      }

      return true
    },
    session({ session, user }) {
      session.user.id = user.id
      session.user.tenantId = user.tenantId
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // This handles the first-time login scenario
      if (!user.id) return

      const [newTenant] = await db
        .insert(tenants)
        .values({
          name: `${user.name || user.email}'s Tenant`,
        })
        .returning()

      await db
        .update(users)
        .set({ tenantId: newTenant.id })
        .where(eq(users.id, user.id))
    },
  },
})
