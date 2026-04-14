# Design Spec: Zwevende Top-index (Sticky Navigation)

**Datum**: 2026-04-14
**Doel**: Verbeteren van de navigatie-index op de `/reference` transparantiepagina met een zwevende, responsieve "pil" interface.

## Doelstelling en Use Case

De huidige statische index staat visueel onopvallend bovenaan de content, en verdwijnt zodra een gebruiker over de zware tool-kaarten naar beneden scrollt. 
Om het referentiedocument beter doorzoekbaar te maken, veranderen we de statische balk in een "sticky header". De index volgt de bezoeker als een zwevende pil. De styling wordt geüpgraded met shadow en frosted glass, en op mobiel krijgt de navigatie een eigen horizontale scroll.

## Architectuur en Keuzes

We gebruiken **Optie 1: Pure CSS "Sticky"**.
Dit past het beste bij de `force-static` eigenschap van `/reference`. Er is geen overhead van client components of Javascript nodig.

### Belangrijkste Eigenschappen

- **Plaatsing**: De `<nav class="bp-reference-index">` krijgt in `globals.css` een `position: sticky; top: 1rem;` property en een `z-index: 50`.
- **Centrering**: De balk neemt enkel de benodigde breedte in via `max-width: max-content;` en `margin: 0 auto 1.5rem;`.
- **Visuele scheiding**: Omdat hij over tekst heen glijdt, wordt een semi-transparante achtergrond (blur) gebruikt gecombineerd met een licht opvallende `box-shadow`.
- **Mobiele fallback**: De `ul` lijst krijgt `flex-wrap: nowrap` en `overflow-x: auto;` (met verborgen scrollbars) voor horizontale swipe-ondersteuning.

## Vereiste Aanpassingen (Actiepunten)

1. **`src/app/globals.css`**
   - Update `.bp-reference-index` (sticky, width, styling)
   - Update `.bp-reference-index-list` (overflow-x handling voor mobiel)
   - Pas de styling aan van `.bp-reference-index-label` (marge of verbergen op mobiel if space constrained)

2. **Geen JSX Wijzigingen Nodig**
   - De HTML van `page.tsx` blijft identiek, de class-structuur is al prima voor deze feature.

## Testen & Validatie

- Scroll test in desktop (balk blijft plakken, content schuift er mooi onderdoor door de `z-index` en `backdrop-filter`).
- Scroll test mobiel (horizontaal swipen in de index, geen overflow op body).