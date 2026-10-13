import { IconInfoCircle } from '@tabler/icons-react'
import styles from './app.module.css'

/**
 * A field label with what the field means, in a hover tip over the label row (also on keyboard focus
 * of the ⓘ). Used in step 1 of a mailing and in Instellingen.
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
  return (
    <div className={styles.labelRow} data-tip={tip}>
      {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : <span className={styles.flabel}>{text}</span>}
      <span className={styles.info} role="img" tabIndex={0} aria-label={`Uitleg: ${tip}`}>
        <IconInfoCircle size={14} stroke={1.75} aria-hidden="true" />
      </span>
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
