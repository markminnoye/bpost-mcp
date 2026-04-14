# Floating Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak de top-index op `/reference` sticky met frosted glass styling en horizontale scroll voor mobiel.

**Architecture:** Pure CSS (position: sticky), direct op de `.bp-reference-index` container in `globals.css` zonder JSX wijzigingen of JavaScript overhead.

**Tech Stack:** CSS

---

### Task 1: Implementeer CSS styling voor desktop en mobiel (Puur CSS)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Voeg sticky positionering en frosted glass toe aan index container**

Vervang in `src/app/globals.css` het blok `.bp-reference-index` door:

```css
/* Reference page top index */
.bp-reference-index {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(248, 250, 252, 0.85); /* Halftransparant ipv solid #f8fafc */
  backdrop-filter: blur(8px); /* Frosted glass effect */
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--bp-border);
  border-radius: 10px;
  margin: 0 auto 1.5rem; /* Gecentreerd via auto margins */
  max-width: max-content; /* Omsluit alleen de benodigde breedte */
  position: sticky;
  top: 1rem;
  z-index: 50;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* Zwevend effect */
}
```

- [ ] **Step 2: Voeg horizontale scroll toe aan de index lijst voor mobiel**

Vervang in `src/app/globals.css` het blok `.bp-reference-index-list` door:

```css
.bp-reference-index-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: nowrap; /* Voorkom wrappen op kleine schermen */
  gap: 0.35rem 0.6rem;
  overflow-x: auto; /* Laat swipen toe */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Verberg scrollbar in Firefox */
}

.bp-reference-index-list::-webkit-scrollbar {
  display: none; /* Verberg scrollbar in Chrome/Safari */
}
```

- [ ] **Step 3: Verberg INHOUD-label op smalle schermen en haal border radius weg**

Voeg onder de `.bp-reference-index-label` definitie in `src/app/globals.css` de volgende media query toe:

```css
@media (max-width: 640px) {
  .bp-reference-index {
    max-width: 100%; /* Neem alle ruimte in op mobiel */
    border-radius: 0; /* Geen ronde hoeken als we de rand raken */
    border-left: none;
    border-right: none;
  }
  .bp-reference-index-label {
    display: none; /* Verberg 'INHOUD' tekst op kleine schermen om ruimte te besparen */
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): make reference index sticky with frosted glass and mobile scroll"
```