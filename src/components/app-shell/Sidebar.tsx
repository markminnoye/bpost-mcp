'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconArchive,
  IconCalendar,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMail,
  IconSettings,
  IconTruck,
  IconX,
} from '@tabler/icons-react'
import { Placeholder } from './Placeholder'
import { UserMenu } from './UserMenu'
import type { ShellUser } from './AppShell'
import styles from './app.module.css'

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true } as const

/**
 * The sidebar: tenant at the top, Mailings · Deposits · Planning · Archief, Instellingen at the bottom,
 * then the user and the collapse button (SR-112 §4). Below 1024 px it is a panel (`panelOpen`).
 */
export function Sidebar({
  tenantName,
  user,
  collapsed,
  onToggleCollapsed,
  dark,
  onToggleDark,
  panelOpen,
  onClosePanel,
}: {
  tenantName: string
  user: ShellUser
  collapsed: boolean
  onToggleCollapsed: () => void
  dark: boolean
  onToggleDark: () => void
  panelOpen: boolean
  onClosePanel: () => void
}) {
  const pathname = usePathname()
  const firstLink = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (panelOpen) firstLink.current?.focus()
  }, [panelOpen])

  const current = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined)
  const tip = (label: string) => (collapsed ? label : undefined)
  const close = () => panelOpen && onClosePanel()

  return (
    <aside
      className={styles.side}
      aria-label="Menu"
      {...(panelOpen ? { role: 'dialog', 'aria-modal': true } : {})}
    >
      <div className={styles.sideTop}>
        <span className={styles.tenant}>
          <span className={styles.tenantIcon} aria-hidden="true">
            {tenantName.trim()[0]?.toUpperCase() ?? '?'}
          </span>
          <span className={styles.tenantName}>{tenantName}</span>
        </span>
        <button type="button" className={`${styles.iconBtn} ${styles.sideClose}`} aria-label="Menu sluiten" onClick={onClosePanel}>
          <IconX {...ICON} />
        </button>
      </div>
      <nav aria-label="Hoofdmenu" style={{ display: 'contents' }}>
        <ul>
          <li>
            <Link ref={firstLink} href="/mailings" className={styles.navItem} aria-current={current('/mailings')} data-tip={tip('Mailings')} onClick={close}>
              <IconMail {...ICON} />
              <span className={styles.navLabel}>Mailings</span>
            </Link>
          </li>
          <li>
            <Placeholder className={styles.navItem} tip="Deposits: dit onderdeel bouwen we nog">
              <IconTruck {...ICON} />
              <span className={styles.navLabel}>Deposits</span>
            </Placeholder>
          </li>
          <li>
            <Link href="/planning" className={styles.navItem} aria-current={current('/planning')} data-tip={tip('Planning')} onClick={close}>
              <IconCalendar {...ICON} />
              <span className={styles.navLabel}>Planning</span>
            </Link>
          </li>
          <li>
            <Link href="/archief" className={styles.navItem} aria-current={current('/archief')} data-tip={tip('Archief')} onClick={close}>
              <IconArchive {...ICON} />
              <span className={styles.navLabel}>Archief</span>
            </Link>
          </li>
        </ul>
        <ul className={styles.navBottom}>
          <li>
            <Link
              href="/instellingen"
              className={styles.navItem}
              aria-current={current('/instellingen')}
              data-tip={tip('Instellingen')}
              onClick={close}
            >
              <IconSettings {...ICON} />
              <span className={styles.navLabel}>Instellingen</span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className={styles.sideFoot}>
        <UserMenu user={user} dark={dark} onToggleDark={onToggleDark} collapsed={collapsed} />
        <button
          type="button"
          className={`${styles.collapseBtn} ${styles.tipAbove}`}
          aria-label={collapsed ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
          aria-expanded={!collapsed}
          data-tip={collapsed ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <IconLayoutSidebarLeftExpand {...ICON} /> : <IconLayoutSidebarLeftCollapse {...ICON} />}
        </button>
      </div>
    </aside>
  )
}
