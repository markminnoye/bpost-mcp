/**
 * Generates a large, made-up address list in Contrapunt's export layout, for the scale test of the
 * web POC (/masspost/poc). About 3 % of the rows get a deliberate format problem (typographic
 * characters, a slash in the house number, a too long street or name, an empty postcode).
 *
 * Usage:
 *   npx tsx scripts/generate-large-address-xlsx.ts --rows 35000 --out tmp/adressen-35000.xlsx
 *   (an --out ending in .xls writes Excel 97-2003, which holds at most 65,535 rows below the header)
 *
 * Everything is fictitious and deterministic (seeded), so runs are comparable. Write to `tmp/`
 * (gitignored): the files are large and must not be committed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { xlsxBuffer } from '../src/core/masspost/fixtures/xlsx'

const HEADERS = [
  'Roepnaam',
  'Familienaam',
  'Correspondentieadres - Straat (Key)',
  'Correspondentieadres - Huisnummer (Key)',
  'Correspondentieadres - aanv. huisnr. (Key)',
  'Correspondentieadres - Postcode (Key)',
  'Correspondentieadres - Plaats (Key)',
  'Correspondentieadres - Land (Tekst)',
]

const GIVEN = ['An', 'Bart', 'Els', 'Jan', 'Lieve', 'Marc', 'Nele', 'Pieter', 'Sarah', 'Tom', 'Wim', 'Inge', 'Koen', 'Lotte', 'Ruben', 'Griet']
const FAMILY = ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Van den Broeck', 'Dubois', 'Lemmens', 'Aerts', 'Hermans', 'Verstraete']
const STREETS = ['Kerkstraat', 'Dorpsstraat', 'Molenstraat', 'Stationsstraat', 'Nieuwstraat', 'Schoolstraat', 'Kapellestraat', 'Veldstraat', 'Lindenlaan', 'Leopoldlaan', 'Brugsesteenweg', 'Pastorijstraat']
const PLACES: [number, string][] = [[9340, 'Lede'], [9300, 'Aalst'], [9000, 'Gent'], [8500, 'Kortrijk'], [2000, 'Antwerpen'], [3000, 'Leuven'], [9100, 'Sint-Niklaas'], [9700, 'Oudenaarde']]

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/** Small seeded PRNG (mulberry32), so every run with the same size gives the same file. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function main() {
  const rows = Number(arg('rows', '35000'))
  const out = arg('out', `tmp/adressen-${rows}.xlsx`)
  if (!Number.isInteger(rows) || rows < 1) throw new Error('--rows must be a positive integer')
  const bookType = out.toLowerCase().endsWith('.xls') ? 'xls' : 'xlsx'
  if (bookType === 'xls' && rows > 65_535) throw new Error('.xls holds at most 65,535 rows below the header')
  await mkdir(path.dirname(out), { recursive: true })

  const random = rng(rows)
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]
  const data: unknown[][] = [HEADERS]

  let problems = 0
  for (let i = 0; i < rows; i++) {
    let given = pick(GIVEN)
    let family = pick(FAMILY)
    let street = pick(STREETS)
    let number: string | number = 1 + Math.floor(random() * 250)
    const box = random() < 0.1 ? `bus ${1 + Math.floor(random() * 20)}` : ''
    let [postcode, place]: [number | string, string] = pick(PLACES)

    if (random() < 0.03) {
      problems++
      switch (Math.floor(random() * 6)) {
        case 0:
          family = `D’${family}`
          break
        case 1:
          number = `${number}–${Number(number) + 2}`
          break
        case 2:
          number = `${number}/${1 + Math.floor(random() * 9)}`
          break
        case 3:
          street = `Burgemeester Edgard Van Hoorebeke${street.toLowerCase()}`
          break
        case 4:
          postcode = ''
          place = ''
          break
        default:
          given = `${given}‑${pick(GIVEN)}`
      }
    }
    data.push([given, family, street, number, box, postcode, place, 'België'])
  }
  await writeFile(out, xlsxBuffer(data, 'Blad1', bookType))
  console.log(`${out}: ${rows} adressen, ${problems} met een bewuste formaatfout`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
