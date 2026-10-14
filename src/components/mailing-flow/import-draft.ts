import {
  defaultRoundSequence,
  presortLocked,
  roundSequenceAllowed,
  type MailingDetails,
} from '@/core/masspost/store/mailing'
import { addressFileBaseName } from '@/core/masspost/address-file'
import type { TenantDefaults } from '@/lib/tenant/settings-schema'

/** The fields of step 1 while the user fills them in. */
export interface ImportDraft {
  customer: string
  title: string
  code: string
  expectedDeliveryDate: string
  format: 'Small' | 'Large'
  priority: 'NP' | 'P'
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  mode: 'T' | 'C' | 'P'
  /** E-mail for e-MassPost Contacts when a check or create is done. */
  notifyEmail: string
  roundAndSequence: boolean
  /** The user chose round and sequence; the default no longer applies. */
  roundSequenceTouched: boolean
}

/**
 * Step 1 with the tenant defaults and the proposed code.
 * Prefills "E-mail bij klaar" from Instellingen, otherwise from the signed-in user.
 * @param defaults From Instellingen.
 * @param code The proposed code.
 * @param userEmail E-mail of the signed-in user (fallback when no tenant default).
 * @returns An empty draft.
 */
export function initialDraft(defaults: TenantDefaults, code: string, userEmail = ''): ImportDraft {
  return {
    customer: '',
    title: '',
    code,
    expectedDeliveryDate: '',
    format: defaults.format,
    priority: defaults.priority,
    genMID: defaults.genMID,
    genPSC: defaults.genPSC,
    mode: defaults.mode,
    notifyEmail: defaults.notifyEmail.trim() || userEmail.trim(),
    roundAndSequence: false,
    roundSequenceTouched: false,
  }
}

function applyRules(d: ImportDraft, addresses: number | null): ImportDraft {
  const n = addresses ?? 0
  return {
    ...d,
    genPSC: presortLocked(d.format, n) ? 'Y' : d.genPSC,
    roundAndSequence: !roundSequenceAllowed(d.format)
      ? false
      : d.roundSequenceTouched
        ? d.roundAndSequence
        : defaultRoundSequence(d.format, n),
  }
}

/**
 * After a file was read: the file name becomes the title when it is empty, and the rules for presort
 * and round and sequence follow the number of addresses.
 * @param d The draft.
 * @param fileName Name of the Excel file.
 * @param addresses Number of addresses read.
 * @returns The new draft.
 */
export function withFile(d: ImportDraft, fileName: string, addresses: number): ImportDraft {
  const title = d.title.trim() ? d.title : addressFileBaseName(fileName)
  return applyRules({ ...d, title }, addresses)
}

/**
 * After the format changed.
 * @param d The draft.
 * @param format Small or Large.
 * @param addresses Number of addresses, null when no file yet.
 * @returns The new draft.
 */
export function withFormat(d: ImportDraft, format: ImportDraft['format'], addresses: number | null): ImportDraft {
  return applyRules({ ...d, format }, addresses)
}

/**
 * The details to store.
 * @param d The draft.
 * @returns The mailing details.
 */
export function toDetails(d: ImportDraft): MailingDetails {
  return {
    code: d.code.trim(),
    title: d.title.trim(),
    customer: { name: d.customer.trim(), crmId: null },
    expectedDeliveryDate: d.expectedDeliveryDate,
    format: d.format,
    priority: d.priority,
    genMID: d.genMID,
    genPSC: d.genPSC,
    roundAndSequence: d.roundAndSequence,
    mode: d.mode,
    notifyEmail: d.notifyEmail.trim(),
  }
}
