import { getInstallPromptMarkdown } from '@/lib/install/load-install-prompt'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const body = await getInstallPromptMarkdown()
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    console.error('[install/prompt] Failed to read install prompt:', err)
    return new Response('Install prompt could not be loaded.', { status: 404 })
  }
}
