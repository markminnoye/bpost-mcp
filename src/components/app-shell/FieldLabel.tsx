'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { IconInfoCircle } from '@tabler/icons-react'
import styles from './app.module.css'

/**
 * A field label with what the field means. The ⓘ next to the label is the only trigger: the pointer
 * becomes a question mark on hover, and a click (or Enter/Space) shows the explanation. Used in step 1
 * of a mailing and in Instellingen.
 * @param props The input it labels (none for a group of checkboxes), the text, whether it is
 * required (red asterisk), and the meaning.
 */
export function FieldLabel({
  htmlFor,
  label,
  required,
  tip,
}: {
  htmlFor?: string
  label: string
  required?: boolean
  tip: string
}) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const text = (
    <>
      {label}
      {required && (
        <>
          {' '}
          <span className={styles.req}>*</span>
        </>
      )}
    </>
  )

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && rowRef.current?.contains(target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.labelRow} ref={rowRef}>
      {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : <span className={styles.flabel}>{text}</span>}
      <button
        type="button"
        className={styles.info}
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={`Uitleg bij ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <IconInfoCircle size={14} stroke={1.75} aria-hidden="true" />
      </button>
      {open && (
        <span id={tipId} className={styles.infoTip} role="status">
          {tip}
        </span>
      )}
    </div>
  )
}

/**
 * The message under a field with a problem (red, as in the format check), or nothing.
 * @param props The id the input refers to with `aria-describedby`, and the message.
 */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null
  return (
    <span id={id} className={styles.fieldError}>
      {message}
    </span>
  )
}
