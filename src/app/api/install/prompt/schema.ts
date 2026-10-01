import { z } from 'zod'

/** `GET /api/install/prompt` success body (`text/markdown`). The handler does not parse this. */
export const InstallPromptBodySchema = z.string().meta({
  id: 'InstallPromptBody',
  description: 'Install assistant prompt as Markdown.',
})

/** Plain-text body when the prompt file cannot be read. */
export const InstallPromptMissingSchema = z
  .literal('Install prompt could not be loaded.')
  .meta({ id: 'InstallPromptMissing' })
