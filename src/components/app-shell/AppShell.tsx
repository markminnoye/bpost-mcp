'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconLayoutSidebarLeftExpand } from '@tabler/icons-react'
import { Sidebar } from './Sidebar'
import { useStoredPreference } from './useStoredPreference'
import './tokens.css'
import styles from './app.module.css'

/** The signed-in user, as shown at the bottom of the sidebar. */
export interface ShellUser {
  name: string
  email: string
  image?: string | null
}

const PanelContext = createContext<{ open: () => void }>({ open: () => {} })

/**
 * The app shell (SR-112 §4, decisions 23, 26, 27): a full-height sidebar without top bar, collapsible
 * to 56 px; below 1024 px a panel that slides in from the left.
 * @param props Tenant name, user and the page.
 */
export function AppShell({ tenantName, user, children }: { tenantName: string; user: ShellUser; children: ReactNode }) {
  const [theme, setTheme] = useStoredPreference('theme', ['light', 'dark'] as const, 'light')
  const [collapsed, setCollapsed] = useStoredPreference('sidebar', ['open', 'collapsed'] as const, 'open')
  const [panelOpen, setPanelOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  const closePanel = useCallback(() => setPanelOpen(false), [])

  // Back to the button that opened the panel, after the render: while the page is still inert,
  // the browser ignores focus().
  useEffect(() => {
    if (panelOpen || !opener.current) return
    opener.current.focus()
    opener.current = null
  }, [panelOpen])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  // The page behind the panel and the theme of the document (scrollbars, dialogs) follow the shell.
  useEffect(() => {
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const openPanel = useCallback(() => {
    opener.current = document.activeElement as HTMLElement
    setPanelOpen(true)
  }, [])

  return (
    <div
      className={`app ${styles.shell}`}
      data-theme={theme}
      data-collapsed={collapsed === 'collapsed' || undefined}
      data-panel={panelOpen || undefined}
    >
      <Sidebar
        tenantName={tenantName}
        user={user}
        collapsed={collapsed === 'collapsed'}
        onToggleCollapsed={() => setCollapsed(collapsed === 'collapsed' ? 'open' : 'collapsed')}
        dark={theme === 'dark'}
        onToggleDark={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        panelOpen={panelOpen}
        onClosePanel={closePanel}
      />
      <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />
      <PanelContext.Provider value={{ open: openPanel }}>
        {/* With the panel open, the page behind it is out of reach (focus stays in the panel). */}
        <main className={styles.content} inert={panelOpen || undefined}>
          {children}
        </main>
      </PanelContext.Provider>
    </div>
  )
}

/**
 * Page title, with the icon that opens the sidebar panel below 1024 px, and optional actions on the
 * right.
 * @param props Title, actions, and content under the title.
 */
export function PageHeader({
  title,
  icon,
  actions,
  children,
}: {
  title: ReactNode
  /** Before the title, e.g. the status of a mailing (outside the heading, so its name stays the title). */
  icon?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const { open } = useContext(PanelContext)
  return (
    <div className={styles.pageHeader}>
      <button type="button" className={`${styles.iconBtn} ${styles.panelToggle}`} aria-label="Menu openen" onClick={open}>
        <IconLayoutSidebarLeftExpand size={18} stroke={1.75} aria-hidden="true" />
      </button>
      <div className={styles.pageTitle}>
        {icon ? (
          <div className={styles.titleRow}>
            {icon}
            <h1 tabIndex={-1}>{title}</h1>
          </div>
        ) : (
          <h1 tabIndex={-1}>{title}</h1>
        )}
        {children}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  )
}
