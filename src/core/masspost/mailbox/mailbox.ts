// src/core/masspost/mailbox/mailbox.ts
// The mailbox to bpost (SR-112 v1 spec, "brievenbus"; design 13/10, decisions 9 and 11): the app puts
// a request in it and takes responses out. How files travel to and from bpost, the app does not know.

/** A file in the mailbox: its bpost name and bytes (ISO-8859-1 XML). */
export interface MailboxFile {
  name: string
  bytes: Uint8Array
}

/** Kinds of mailbox. A choice in Instellingen once there is more than one (decision 11). */
export type MailboxKind = 'manual' | 'drive'

/** The mailbox of a tenant. */
export interface Mailbox {
  readonly kind: MailboxKind
  /** Puts a request in the mailbox. */
  send(file: MailboxFile): Promise<void>
  /** Response files (`_1AK`, `_2RS`) waiting to be processed. */
  responses(): Promise<MailboxFile[]>
  /** Takes a processed response out of the mailbox. */
  remove(name: string): Promise<void>
}

/** The kinds, for the block "Verbinding met e-MassPost" in Instellingen. */
export const MAILBOX_KINDS: readonly { kind: MailboxKind; label: string; available: boolean; tip: string }[] = [
  {
    kind: 'manual',
    label: 'Manueel',
    available: true,
    tip: 'Je slaat het bestand voor e-MassPost op, laadt het op via de e-MassPost-website en zet het antwoord terug in de app.',
  },
  {
    kind: 'drive',
    label: 'Google Drive',
    available: false,
    tip: 'Binnenkort: de app zet het bestand op je gedeelde drive en leest het antwoord van e-MassPost vanzelf in.',
  },
]
