// Entry for the standalone HTML file (`npm run build:poc`): the same POC, opened from file:// and offline.
import { createRoot } from 'react-dom/client'
import { PocFlow } from './PocFlow'

declare const __DOCS_URL__: string

createRoot(document.getElementById('root')!).render(<PocFlow docsUrl={__DOCS_URL__ || undefined} />)
