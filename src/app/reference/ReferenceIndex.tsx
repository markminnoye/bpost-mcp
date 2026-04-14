'use client'

import { useEffect, useState } from 'react'

export type SectionEntry = { id: string; label: string }

export function ReferenceIndex({ entries }: { entries: SectionEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observerEntries) => {
        // Filter intersecting entries
        const visibleEntries = observerEntries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          // If multiple are visible, pick the one closest to the top
          // For simplicity, we can just take the first one or we can rely on order.
          setActiveId(visibleEntries[0].target.id)
        }
      },
      {
        rootMargin: '-100px 0px -50% 0px',
      }
    )

    entries.forEach((e) => {
      const el = document.getElementById(e.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  return (
    <nav className="bp-reference-index" aria-label="Inhoud">
      <span className="bp-reference-index-label">Inhoud</span>
      <ul className="bp-reference-index-list">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className={`bp-reference-index-link ${activeId === e.id ? 'is-active' : ''}`}
            >
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}