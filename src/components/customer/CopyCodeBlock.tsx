'use client'

import { useCallback, useState } from 'react'

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export interface CopyCodeBlockProps {
  /** Raw text to copy (trimmed before copy) */
  code: string
  /** Optional accessible label for the copy control */
  copyLabel?: string
}

export function CopyCodeBlock({ code, copyLabel = 'Kopiëren naar klembord' }: CopyCodeBlockProps) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  const onCopy = useCallback(async () => {
    setStatus('idle')
    try {
      await navigator.clipboard.writeText(code)
      setStatus('ok')
      window.setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('err')
      window.setTimeout(() => setStatus('idle'), 2500)
    }
  }, [code])

  const copied = status === 'ok'
  const failed = status === 'err'

  return (
    <div className="bp-code-block">
      <pre className="bp-code-block__pre">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className="bp-code-block__copy"
        onClick={onCopy}
        title={copyLabel}
        aria-label={copyLabel}
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
      </button>
      <p className="bp-code-block__sr" role="status" aria-live="polite">
        {copied && 'Gekopieerd.'}
        {failed && 'Kopiëren mislukt. Probeer opnieuw of kopieer handmatig.'}
      </p>
    </div>
  )
}
