'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { IconArchive, IconArrowRight, IconDeviceFloppy, IconDots, IconRestore, IconTruckDelivery, IconX } from '@tabler/icons-react'
import { Placeholder } from '@/components/app-shell/Placeholder'
import styles from '@/components/app-shell/app.module.css'

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true } as const

/**
 * The "…" menu of a mailing: Openen, Opslaan voor de drukker, and Archiveren (in the archive
 * Terugzetten). Afgegeven markeren and Intrekken are placeholders (SR-112 §4). The file for the
 * printer can only be saved once the format is in order (`printerReady`).
 * @param props Code, whether it is archived, whether the printer file can be made, and the actions.
 */
export function RowMenu({
  code,
  archived,
  printerReady,
  onPrinter,
  onArchive,
  onRestore,
}: {
  code: string
  archived: boolean
  printerReady: boolean
  onPrinter: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem], [aria-disabled=true]') ?? [])].filter(
      (el, i, all) => all.indexOf(el) === i,
    )
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      button.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
    }
  }

  return (
    <div className={styles.menuWrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={styles.more}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acties voor ${code}`}
        onClick={() => setOpen(!open)}
      >
        <IconDots {...ICON} />
      </button>
      {open && (
        <div ref={menu} className={styles.menu} role="menu" aria-label={`Acties voor ${code}`} onKeyDown={onKey}>
          <Link role="menuitem" className={styles.menuItem} href={`/mailings/${encodeURIComponent(code)}`}>
            <IconArrowRight {...ICON} />
            Openen
          </Link>
          {printerReady ? (
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false)
                onPrinter()
              }}
            >
              <IconDeviceFloppy {...ICON} />
              Opslaan voor de drukker
            </button>
          ) : (
            <span
              role="menuitem"
              aria-disabled="true"
              tabIndex={0}
              className={`${styles.menuItem} ${styles.placeholder}`}
              data-tip="Kan pas als de formaatvalidatie in orde is"
            >
              <IconDeviceFloppy {...ICON} />
              Opslaan voor de drukker
            </span>
          )}
          {archived ? (
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false)
                onRestore()
              }}
            >
              <IconRestore {...ICON} />
              Terugzetten naar Mailings
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false)
                onArchive()
              }}
            >
              <IconArchive {...ICON} />
              Archiveren
            </button>
          )}
          <Placeholder className={styles.menuItem} tip="Komt later, samen met het indienen bij bpost">
            <IconTruckDelivery {...ICON} />
            Afgegeven markeren
          </Placeholder>
          <Placeholder className={styles.menuItem} tip="Komt later, samen met het indienen bij bpost">
            <IconX {...ICON} />
            Intrekken
          </Placeholder>
        </div>
      )}
    </div>
  )
}
