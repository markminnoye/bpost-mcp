'use client'

import { useMemo, useState } from 'react'
import type { ToolRegistryParameter, ToolRegistryTool } from '@/lib/mcp/tool-registry-types'

type JsonToggleProps = {
  parameters: ToolRegistryParameter[]
  rawSchema: ToolRegistryTool['rawSchema']
}

export function JsonToggle({ parameters, rawSchema }: JsonToggleProps) {
  const [view, setView] = useState<'readable' | 'json'>('readable')

  const jsonPreview = useMemo(() => {
    if (rawSchema?.source) {
      return `// schema kind: ${rawSchema.kind || 'unknown'}\n${rawSchema.source}`
    }
    return JSON.stringify(rawSchema, null, 2)
  }, [rawSchema])

  return (
    <div className="bp-reference-toggle">
      <div className="bp-reference-toggle-controls" role="group" aria-label="Tool schema preview mode">
        <button
          type="button"
          className={`bp-reference-toggle-btn ${view === 'readable' ? 'bp-reference-toggle-btn--active' : ''}`}
          onClick={() => setView('readable')}
          aria-pressed={view === 'readable'}
        >
          Readable
        </button>
        <button
          type="button"
          className={`bp-reference-toggle-btn ${view === 'json' ? 'bp-reference-toggle-btn--active' : ''}`}
          onClick={() => setView('json')}
          aria-pressed={view === 'json'}
        >
          Schema
        </button>
      </div>

      {view === 'readable' ? (
        parameters.length > 0 ? (
          <table className="bp-reference-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((parameter) => (
                <tr key={parameter.name}>
                  <td><code>{parameter.name}</code></td>
                  <td><code>{parameter.type}</code></td>
                  <td>{parameter.required ? 'yes' : 'no'}</td>
                  <td>{parameter.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="bp-empty-hint">No structured parameters found. This tool may use an external schema.</p>
        )
      ) : (
        <pre className="bp-reference-pre">{jsonPreview}</pre>
      )}
    </div>
  )
}
