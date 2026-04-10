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

export function TokenRow({ token }: TokenRowProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const trashRef = useRef<HTMLButtonElement>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setError(null)
    setIsModalOpen(true)
    dialogRef.current?.showModal()
    // Move focus to Cancel button (safe default for destructive action)
    setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    }, 0)
  }

  function closeModal() {
    setError(null)        // spec: error resets on close
    setIsModalOpen(false)
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
      setError('Failed to delete token. Please try again.')
      return
    }

    if (result.ok) {
      // router.push returns void in Next.js 14. Modal stays open with buttons
      // disabled until the page unmounts after navigation completes.
      router.push(result.redirect)
      return
    }

    if (result.code === 'AUTH_ERROR') {
      closeModal()
      router.push('/api/auth/signin')
      return
    }

    // TRANSIENT_ERROR or VALIDATION_ERROR — show in modal, allow retry
    setIsSubmitting(false)
    setError(result.error)
  }

  return (
    <li style={{
      backgroundColor: '#111',
      padding: '0.8rem',
      marginBottom: '0.5rem',
      border: '1px solid #222',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      {/* Row content */}
      <div>
        <strong style={{ color: '#fff' }}>{token.label}</strong><br />
        <span style={{ fontSize: '0.7rem', color: '#666' }}>Created {token.createdAt}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* lastUsedAt indicator */}
        <span style={{ fontSize: '0.7rem', color: '#666' }}>
          {token.lastUsedAt ? `Last used: ${token.lastUsedAt}` : 'Never used'}
        </span>

        {/* Trash icon */}
        <button
          ref={trashRef}
          onClick={openModal}
          title="Revoke token"
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.2rem 0.4rem',
            lineHeight: 1,
          }}
          aria-label={`Revoke token ${token.label}`}
        >
          🗑
        </button>
      </div>

      {/* Confirmation modal */}
      <dialog
        ref={dialogRef}
        aria-labelledby={`dialog-title-${token.id}`}
        aria-modal="true"
        onCancel={(e) => {
          if (isSubmitting) { e.preventDefault(); return }
          closeModal()
        }}
        onKeyDown={(e) => {
          // Belt-and-suspenders: suppress Escape at keydown level too (onCancel alone
          // is unreliable across browsers when isSubmitting)
          if (e.key === 'Escape' && isSubmitting) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        style={{
          background: '#000',
          border: '2px solid #ff0000',
          color: '#fff',
          fontFamily: 'monospace',
          padding: '1.5rem',
          minWidth: '320px',
          maxWidth: '90vw',
        }}
      >
        <h2 id={`dialog-title-${token.id}`} style={{ color: '#ff0000', marginTop: 0, fontSize: '1rem' }}>
          Delete token
        </h2>
        <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          Are you sure you want to delete <strong style={{ color: '#fff' }}>{token.label}</strong>?
          This cannot be undone.
        </p>

        {error && (
          <p role="alert" style={{ color: '#ff0000', fontSize: '0.8rem', margin: '0 0 1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            data-cancel
            onClick={closeModal}
            disabled={isSubmitting}
            style={{
              background: '#333',
              color: '#fff',
              border: '1px solid #444',
              padding: '0.4rem 0.8rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#660000' : '#ff0000',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 0.8rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            {isSubmitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </dialog>
    </li>
  )
}
