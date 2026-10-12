'use server'

import { signOut } from '@/lib/auth'

/** Signs the user out and goes back to the home page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
