'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconLogout, IconMoon, IconSelector } from '@tabler/icons-react'
import { signOutAction } from './actions'
import type { ShellUser } from './AppShell'
import styles from './app.module.css'

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true } as const

/** Initials of a name or e-mail address, for the avatar. */
function initials(user: ShellUser): string {
  const base = user.name.includes('@') ? user.name.split('@')[0] : user.name
  const parts = base.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/**
 * The user at the bottom of the sidebar. The menu opens upwards with name, e-mail, the dark mode
 * switch and "Afmelden" (SR-112 decision 26).
 * @param props The user, the theme and whether the sidebar is collapsed.
 */
export function UserMenu({
  user,
  dark,
  onToggleDark,
  collapsed,
}: {
  user: ShellUser
  dark: boolean
  onToggleDark: () => void
  collapsed: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role^=menuitem]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      button.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    }
  }

  return (
    <div className={styles.userWrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={`${styles.user} ${collapsed ? styles.tipAbove : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account van ${user.name}`}
        data-tip={collapsed ? user.name : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small Google avatar, no optimisation needed */}
          {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initials(user)}
        </span>
        <span className={styles.userName}>{user.name}</span>
        {!collapsed && <IconSelector size={16} stroke={1.75} aria-hidden="true" />}
      </button>
      {open && (
        <div ref={menu} className={`${styles.menu} ${styles.menuUp}`} role="menu" aria-label="Account" onKeyDown={onMenuKey}>
          <div className={styles.who}>
            <b>{user.name}</b>
            <span>{user.email}</span>
          </div>
          <button type="button" role="menuitemcheckbox" aria-checked={dark} className={styles.menuItem} onClick={onToggleDark}>
            <IconMoon {...ICON} />
            Donkere modus
            <span className={styles.switch} aria-hidden="true" />
          </button>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={styles.menuItem}>
              <IconLogout {...ICON} />
              Afmelden
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
