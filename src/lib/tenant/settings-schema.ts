import { z } from 'zod'

/** Defaults for a new mailing (Instellingen → Standaardwaarden). Safe to import in the browser. */
export interface TenantDefaults {
  format: 'Small' | 'Large'
  priority: 'NP' | 'P'
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  /** Mode at e-MassPost for a new mailing; Production unless the account is set to Test (decision 14). */
  mode: 'T' | 'C' | 'P'
  /**
   * E-mail e-MassPost uses to say when a check or create is done (Contacts). Empty: no mail.
   * Max 100 characters (bpost).
   */
  notifyEmail: string
  /** Never empty: falls back to the initials of the tenant name. */
  codePrefix: string
}

/** Empty or a short e-mail address (bpost Contacts, max 100). */
const notifyEmailField = z
  .string()
  .trim()
  .max(100)
  .refine((s) => s === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Dit lijkt geen geldig e-mailadres.')

/** Form "Organisatie" in Instellingen. */
export const organisationSchema = z.object({ name: z.string().trim().min(1).max(100) })

/** Form "Standaardwaarden" in Instellingen. A missing checkbox means "N". */
export const defaultsSchema = z.object({
  format: z.enum(['Small', 'Large']),
  priority: z.enum(['NP', 'P']),
  genMID: z.enum(['N', '7', '9', '11']),
  genPSC: z.enum(['Y', 'N']).default('N'),
  mode: z.enum(['T', 'C', 'P']).default('P'),
  notifyEmail: notifyEmailField.default(''),
  codePrefix: z
    .string()
    .trim()
    .max(8)
    .regex(/^[A-Za-z0-9]*$/)
    .transform((s) => s.toUpperCase()),
})

/** Form "bpost" in Instellingen. An empty password keeps the stored one. */
export const bpostCredentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().trim(),
  /** Customer Id (PRS): 1 to 8 digits, as on the former dashboard. */
  customerNumber: z.string().trim().regex(/^\d{1,8}$/),
  accountId: z.string().trim().regex(/^\d{1,8}$/),
  barcodeCustomerId: z
    .string()
    .trim()
    .transform((s) => (s === '' ? null : s))
    .pipe(z.string().regex(/^\d{5}$/).nullable()),
})
