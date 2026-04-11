'use client'

import { useCallback, useState, type CSSProperties } from 'react'

const statusStyle: CSSProperties = {
  fontSize: '0.875rem',
  marginTop: '0.6rem',
  minHeight: '1.25rem',
  color: 'var(--bp-muted)',
}

export function CopyInstallPromptButton() {
  const [message, setMessage] = useState('')

  const onCopy = useCallback(async () => {
    setMessage('')
    try {
      const res = await fetch('/api/install/prompt', { method: 'GET' })
      if (!res.ok) {
        setMessage('De prompt kon niet geladen worden. Probeer het later opnieuw.')
        return
      }
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setMessage('Gekopieerd. Plak de tekst in je AI-assistent (bv. Claude).')
    } catch {
      setMessage('Kopiëren is mislukt. Controleer of de site via https opent en probeer opnieuw.')
    }
  }, [])

  return (
    <div>
      <button type="button" className="bp-btn bp-btn--primary" onClick={onCopy}>
        Kopieer de installatie-prompt
      </button>
      <p style={statusStyle} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
