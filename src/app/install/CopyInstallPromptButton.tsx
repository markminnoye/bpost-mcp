'use client'

import { useCallback, useState, type CSSProperties } from 'react'

const btnStyle: CSSProperties = {
  padding: '0.65rem 1.25rem',
  backgroundColor: '#e30613',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
}

const statusStyle: CSSProperties = {
  fontSize: '0.85rem',
  marginTop: '0.5rem',
  minHeight: '1.25rem',
  color: '#333',
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
      <button type="button" style={btnStyle} onClick={onCopy}>
        Kopieer de installatie-prompt
      </button>
      <p style={statusStyle} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
