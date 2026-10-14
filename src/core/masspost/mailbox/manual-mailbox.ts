// src/core/masspost/mailbox/manual-mailbox.ts
import type { Mailbox, MailboxFile } from './mailbox'

/**
 * The mailbox for now: sending saves the file in the browser (download); a response is what the user
 * drops in step 4. Later `DriveMailbox` does both by itself, behind the same interface.
 * @example
 * const box = new ManualMailbox((file) => saveFile(file.bytes, { name: file.name, mime: 'application/xml' }))
 */
export class ManualMailbox implements Mailbox {
  readonly kind = 'manual' as const
  private readonly inbox = new Map<string, Uint8Array>()

  /** @param download Saves a file in the browser. */
  constructor(private readonly download: (file: MailboxFile) => void) {}

  async send(file: MailboxFile): Promise<void> {
    this.download(file)
  }

  /**
   * A response file the user dropped.
   * @param file The file.
   */
  receive(file: MailboxFile): void {
    this.inbox.set(file.name, file.bytes)
  }

  async responses(): Promise<MailboxFile[]> {
    return [...this.inbox].map(([name, bytes]) => ({ name, bytes }))
  }

  async remove(name: string): Promise<void> {
    this.inbox.delete(name)
  }
}
