'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { revokeToken, type ActionResult } from './actions'

interface TokenRowProps {
  token: {
    id: string
    label: string
    createdAt: string
    lastUsedAt: string | null
  }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TrashIcon() {
  return (
    <svg
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function TokenRow({ token }: TokenRowProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const trashRef = useRef<HTMLButtonElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setError(null)
    dialogRef.current?.showModal()
    setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    }, 0)
  }

  function closeModal() {
    setError(null)
    dialogRef.current?.close()
    trashRef.current?.focus()
  }

  async function handleDelete() {
    setIsSubmitting(true)
    let result: ActionResult
    try {
      result = await revokeToken(token.id)
    } catch {
      setIsSubmitting(false)
      setError('Verwijderen is mislukt. Probeer opnieuw.')
      return
    }

    if (result.ok) {
      router.push(result.redirect)
      return
    }

    if (result.code === 'AUTH_ERROR') {
      closeModal()
      router.push('/api/auth/signin')
      return
    }

    setIsSubmitting(false)
    setError(result.error)
  }

  return (
    <li className="bp-token-row">
      <div>
        <strong style={{ color: 'var(--bp-text)' }}>{token.label}</strong>
        <br />
        <span style={{ fontSize: '0.75rem', color: 'var(--bp-soft)' }}>
          Aangemaakt: {formatDateTime(token.createdAt)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--bp-soft)' }}>
          {token.lastUsedAt ? `Laatst gebruikt: ${formatDateTime(token.lastUsedAt)}` : 'Nog niet gebruikt'}
        </span>

        <button
          ref={trashRef}
          type="button"
          onClick={openModal}
          title="App-token intrekken"
          className="bp-btn bp-btn--ghost bp-icon-btn"
          aria-label={`App-token intrekken: ${token.label}`}
        >
          <TrashIcon />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`dialog-title-${token.id}`}
        aria-modal="true"
        className="bp-dialog"
        onCancel={(e) => {
          if (isSubmitting) {
            e.preventDefault()
            return
          }
          closeModal()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isSubmitting) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <h2 id={`dialog-title-${token.id}`} className="bp-dialog-title">
          App-token intrekken?
        </h2>
        <p className="bp-dialog-text">
          Wil je het app-token <strong>{token.label}</strong> echt intrekken? Dat kan niet ongedaan worden.
        </p>

        {error && (
          <p role="alert" style={{ color: 'var(--bp-brand)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            {error}
          </p>
        )}

        <div className="bp-btn-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            data-cancel
            type="button"
            onClick={closeModal}
            disabled={isSubmitting}
            className="bp-btn bp-btn--secondary"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="bp-btn bp-btn--danger"
          >
            {isSubmitting ? 'Bezig…' : 'Intrekken'}
          </button>
        </div>
      </dialog>
    </li>
  )
}
