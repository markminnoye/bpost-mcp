const GITHUB_OWNER = 'markminnoye' as const

export function resolveGithubRepoSlug(repo: 'mcp' | 'skills'): string {
  return repo === 'mcp' ? 'bpost-mcp' : 'bpost-e-masspost-skills'
}

function formatIssueTitle(title: string): string {
  return `[AGENT] ${title}`
}

function formatIssueBody(body: string, footer: string): string {
  return `${body}\n\n---\n${footer}`
}

/** Web UI URL so users can file the same issue when the server has no PAT. */
export function buildNewIssueUrl(repo: 'mcp' | 'skills', title: string, body: string): string {
  const slug = resolveGithubRepoSlug(repo)
  const issueTitle = formatIssueTitle(title)
  const issueBody = formatIssueBody(body, '*Gemeld via BPost MCP (handmatig)*')
  const params = new URLSearchParams({ title: issueTitle, body: issueBody })
  return `https://github.com/${GITHUB_OWNER}/${slug}/issues/new?${params.toString()}`
}

type ReportIssueInput = { repo: 'mcp' | 'skills'; title: string; body: string }

type ToolTextResult = { content: Array<{ type: 'text'; text: string }>; isError: boolean }

/**
 * Creates a GitHub issue via REST when `githubToken` is set; otherwise returns a
 * prefilled "new issue" URL for the end user (requires a GitHub account in the browser).
 */
export async function reportIssueToGithub(
  githubToken: string | undefined,
  input: ReportIssueInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ToolTextResult> {
  const manualUrl = buildNewIssueUrl(input.repo, input.title, input.body)
  const token = githubToken?.trim()

  if (!token) {
    return {
      isError: false,
      content: [{
        type: 'text',
        text:
          'Automatisch aanmaken van een GitHub-issue is op deze server niet ingesteld. ' +
          'Geef de gebruiker onderstaande link: die opent het juiste formulier op GitHub zodat ze het zelf kunnen indienen (een GitHub-account is dan nodig).\n\n' +
          manualUrl,
      }],
    }
  }

  const slug = resolveGithubRepoSlug(input.repo)
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${slug}/issues`

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: formatIssueTitle(input.title),
        body: formatIssueBody(input.body, '*Reported by BPost MCP Agent*'),
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[report_issue] GitHub API rejected request:', res.status, errorText)
      return {
        isError: true,
        content: [{
          type: 'text',
          text:
            `GitHub weigerde het aanmaken (${res.status}). ${errorText}\n\n` +
            'Leg de gebruiker uit dat het automatisch melden mislukte. Ze kunnen hetzelfde issue handmatig indienen via deze link:\n' +
            manualUrl,
        }],
      }
    }

    const issue = (await res.json()) as { html_url?: string }
    const link = issue.html_url ?? manualUrl
    return {
      isError: false,
      content: [{ type: 'text', text: `Het GitHub-issue is aangemaakt: ${link}` }],
    }
  } catch (err) {
    console.error('[report_issue] GitHub request failed:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return {
      isError: true,
      content: [{
        type: 'text',
        text:
          `Het aanmaken op GitHub lukte niet: ${msg}\n\n` +
          'Handmatig indienen kan via:\n' +
          manualUrl,
      }],
    }
  }
}
