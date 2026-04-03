import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's internal tenant ID. */
      tenantId?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    tenantId?: string | null
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    tenantId?: string | null
  }
}
