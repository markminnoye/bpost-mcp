import { readFile } from 'fs/promises'
import path from 'path'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ToolRegistry } from '@/lib/mcp/tool-registry-types'
import { JsonToggle } from '@/app/reference/JsonToggle'
import { ReferenceIndex, type SectionEntry } from '@/app/reference/ReferenceIndex'

export const dynamic = 'force-static'

export const metadata = {
  title: 'MCP Transparency Reference',
  description: 'Static transparency page for MCP tools, instructions, resources, and prompts.',
}

const GENERATED_REGISTRY_PATH = path.join(process.cwd(), 'src/generated/tool-registry.json')

function emptyRegistry(): ToolRegistry {
  return {
    generatedAt: '',
    serverInfo: { name: 'Unknown server', version: '-', description: '', iconUrl: '' },
    instructions: '',
    tools: [],
    resources: [],
    prompts: [],
  }
}

async function loadRegistry(): Promise<ToolRegistry> {
  try {
    const file = await readFile(GENERATED_REGISTRY_PATH, 'utf8')
    return JSON.parse(file) as ToolRegistry
  } catch {
    return emptyRegistry()
  }
}

function renderAnnotationBadges(annotations: Record<string, boolean> | undefined) {
  if (!annotations) return null
  const entries = Object.entries(annotations)
  if (entries.length === 0) return null

  return (
    <div className="bp-reference-badges">
      {entries.map(([key, enabled]) => (
        <span key={key} className={`bp-reference-badge ${enabled ? 'bp-reference-badge--on' : 'bp-reference-badge--off'}`}>
          {key}: {String(enabled)}
        </span>
      ))}
    </div>
  )
}

export default async function ReferencePage() {
  const registry = await loadRegistry()
  return renderReferencePage(registry)
}

export function renderReferencePage(registry: ToolRegistry) {
  const hasResources = registry.resources.length > 0
  const hasPrompts = registry.prompts.length > 0
  const hasTools = registry.tools.length > 0

  const indexEntries: SectionEntry[] = [
    { id: 'server-info', label: 'Server info' },
    { id: 'instructions', label: 'Instructions' },
    { id: 'tools', label: `Tools (${registry.tools.length})` },
    ...(hasResources ? [{ id: 'resources', label: `Resources (${registry.resources.length})` }] : []),
    ...(hasPrompts ? [{ id: 'prompts', label: `Prompts (${registry.prompts.length})` }] : []),
  ]

  return (
    <main className="bp-shell">
      <header id="server-info" className="bp-section bp-reference-header">
        {registry.serverInfo.iconUrl ? (
          <Image src={registry.serverInfo.iconUrl} alt="" width={32} height={32} className="bp-reference-icon" unoptimized />
        ) : null}
        <div className="bp-reference-header-copy">
          <h1 className="bp-page-title">MCP Knowledge Transparency</h1>
          <p className="bp-page-lead">
            Public reference of what the MCP server shares with AI clients at build time.
          </p>
          <div className="bp-reference-meta">
            <span className="bp-reference-server">{registry.serverInfo.name || 'Unknown server'}</span>
            <span className="bp-reference-version">v{registry.serverInfo.version || '-'}</span>
          </div>
          {registry.serverInfo.description ? <p className="bp-prose">{registry.serverInfo.description}</p> : null}
          {registry.generatedAt ? <p className="bp-empty-hint">Generated: {registry.generatedAt}</p> : null}
        </div>
      </header>

      <ReferenceIndex entries={indexEntries} />

      <section id="instructions" className="bp-section bp-card">
        <h2 className="bp-section-title">System instructions</h2>
        <details className="bp-reference-details">
          <summary>Show full MCP server instructions</summary>
          {registry.instructions ? (
            <div className="bp-reference-block bp-reference-markdown bp-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{registry.instructions}</ReactMarkdown>
            </div>
          ) : (
            <p className="bp-empty-hint">No instructions found.</p>
          )}
        </details>
      </section>

      <section id="tools" className="bp-section">
        <h2 className="bp-section-title">Tools ({registry.tools.length})</h2>
        {!hasTools ? (
          <p className="bp-empty-hint">No tools found in the extracted registry.</p>
        ) : (
          <div className="bp-reference-grid">
            {registry.tools.map((tool) => (
              <article key={tool.name} className="bp-card bp-reference-card">
                <h3 className="bp-subtitle bp-reference-card-title">{tool.name}</h3>
                {tool.description ? (
                  <div className="bp-reference-markdown bp-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="bp-empty-hint">No description available.</p>
                )}
                {renderAnnotationBadges(tool.annotations)}
                <div className="bp-reference-params">
                  <JsonToggle parameters={tool.parameters} rawSchema={tool.rawSchema} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {hasResources ? (
        <section id="resources" className="bp-section">
          <h2 className="bp-section-title">Resources ({registry.resources.length})</h2>
          <div className="bp-reference-grid">
            {registry.resources.map((resource) => (
              <article key={resource.name} className="bp-card bp-reference-card">
                <h3 className="bp-subtitle bp-reference-card-title">{resource.name}</h3>
                {resource.description ? (
                  <div className="bp-reference-markdown bp-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{resource.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="bp-empty-hint">No description available.</p>
                )}
                <pre className="bp-reference-pre">{JSON.stringify(resource, null, 2)}</pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hasPrompts ? (
        <section id="prompts" className="bp-section">
          <h2 className="bp-section-title">Prompts ({registry.prompts.length})</h2>
          <div className="bp-reference-grid">
            {registry.prompts.map((prompt) => (
              <article key={prompt.name} className="bp-card bp-reference-card">
                <h3 className="bp-subtitle bp-reference-card-title">{prompt.name}</h3>
                {prompt.description ? (
                  <div className="bp-reference-markdown bp-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="bp-empty-hint">No description available.</p>
                )}
                <pre className="bp-reference-pre">{JSON.stringify(prompt, null, 2)}</pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
