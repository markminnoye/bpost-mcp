'use client'

import { useCallback, useState, type CSSProperties } from 'react'

const btnStyle: CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#e30613',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  boxShadow: '0 2px 8px rgba(227, 6, 19, 0.25)',
  transition: 'all 0.2s ease',
}

const statusStyle: CSSProperties = {
  fontSize: '0.875rem',
  marginTop: '0.6rem',
  minHeight: '1.25rem',
  color: '#444',
  fontFamily: 'system-ui, sans-serif',
}

export function CopyInstallPromptButton() {
  const [message, setMessage] = useState('')
  const [isHovered, setIsHovered] = useState(false)

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
      <button
        type="button"
        style={{
          ...btnStyle,
          backgroundColor: isHovered ? '#c30511' : '#e30613',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isHovered
            ? '0 4px 16px rgba(227, 6, 19, 0.35)'
            : '0 2px 8px rgba(227, 6, 19, 0.25)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onCopy}
      >
        Kopieer de installatie-prompt
      </button>
      <p style={statusStyle} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
