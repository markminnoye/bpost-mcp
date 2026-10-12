'use client'

import { useEffect, useRef } from 'react'

/**
 * Catches leaving the page inside the app while `active()` is true: a click on an internal link
 * (sidebar, menus) and, with `back`, the browser's back button. Reloading or closing the tab is
 * caught separately with `beforeunload`.
 * @param active Asked at the moment the user leaves.
 * @param onLeave Gets the path the user wanted, or `'back'` for the back button. The navigation is
 * stopped; call `router.push` (or `history.go(-2)` for back) to continue.
 * @param options `back`: also catch the back button (adds one history entry while mounted).
 */
export function useLeaveGuard(active: () => boolean, onLeave: (to: string) => void, options: { back?: boolean } = {}) {
  const activeRef = useRef(active)
  const onLeaveRef = useRef(onLeave)
  activeRef.current = active
  onLeaveRef.current = onLeave

  useEffect(() => {
    // Capture phase: before Next's <Link> handles the click.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || !activeRef.current()) return
      const url = new URL(link.href, location.href)
      if (url.origin !== location.origin || url.pathname + url.search === location.pathname + location.search) return
      e.preventDefault()
      e.stopPropagation()
      onLeaveRef.current(url.pathname + url.search)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (!options.back) return
    // An extra entry for this page: the back button lands on it first, and we can ask.
    history.pushState(history.state, '', location.href)
    const onPop = () => {
      if (!activeRef.current()) return
      history.pushState(history.state, '', location.href)
      onLeaveRef.current('back')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [options.back])
}
