// Sample list with the column titles of Contrapunt's sample file and the format problems from the sketch.
// All names and addresses are made up: this repository is public.
import type { LoadedList } from './columns'

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

type Row = [string, string, string, string | number, string, string | number, string, string]

const ROWS: Row[] = [
  ['An', 'Peeters', 'Kerkstraat', 4, '', 9340, 'Lede', 'België'],
  ['Jan', '’t Hooft', 'Dorpsstraat', 4, '', 9340, 'Lede', 'België'],
  ['Els', 'Martens', 'Kerkstraat', '12–14', '', 9300, 'Aalst', 'België'],
  ['Bart', 'Van den Broeck', 'Molenstraat', 18, '', 9300, 'Aalst', 'België'],
  ['', 'Stadsbestuur Lede', 'Grote Markt', 1, '• 3de verdieping', 9340, 'Lede', 'België'],
  ['Ann‑Sofie', 'Claes', 'Leopoldlaan', 9, '', 9300, 'Aalst', 'België'],
  ['Tom', 'De Smet', 'Nieuwstraat', 102, '', 9000, 'Gent', 'België'],
  ['Pieter', 'Wouters', 'Sint–Pietersnieuwstraat', 33, '', 9000, 'Gent', 'België'],
  ['Lieve', 'D’Hondt', 'Kouterstraat', 21, '', 9340, 'Lede', 'België'],
  ['Sarah', 'Goossens', 'Stationsstraat', 45, 'bus 3', 9300, 'Aalst', 'België'],
  ['Vereniging voor Natuur- en', 'Vogelbescherming Kortrijk vzw', 'Doorniksesteenweg', 214, '', 8500, 'Kortrijk', 'België'],
  ['Marc', 'De Vos', 'Burgemeester Edgard Van Hoorebekestraat', 112, 'bus 0201', 9040, 'Gent', 'België'],
  ['Koen', 'Janssens', 'Leopoldlaan', '9/2', '', 9300, 'Aalst', 'België'],
  ['Hilde', 'Maes', 'Hoogstraat\nOost', 5, '', 9340, 'Lede', 'België'],
  ['Familie', 'Peeters-Janssens', 'Molenstraat', 7, 'bus 2', '', '', 'België'],
  ['', '', 'Stationsstraat', 3, '', 9340, 'Lede', 'België'],
  ['', 'Koninklijke Harmonie Sint-Cecilia Oudenaarde en Omstreken', 'Markt', 1, '', 9700, 'Oudenaarde', 'België'],
  ['Sofie', 'Mertens 🌻', 'Bergstraat', 12, '', 9340, 'Lede', 'België'],
  ['Wim', 'Jacobs', 'Brugsesteenweg', 230, '', 9000, 'Gent', 'België'],
  ['Inge', 'Willems', 'Kapellestraat', 6, '', 9340, 'Lede', 'België'],
  ['Dirk', 'Claeys', 'Ninoofsesteenweg', 87, '', 9300, 'Aalst', 'België'],
  ['Kathleen', 'Hermans', 'Pastorijstraat', 2, '', 9340, 'Lede', 'België'],
  ['Stijn', 'Lemmens', 'Veldstraat', 61, 'bus 12', 9000, 'Gent', 'België'],
  ['Griet', 'Aerts', 'Schoolstraat', 15, '', 9340, 'Lede', 'België'],
  ['Joris', 'Van Damme', 'Lindenlaan', 3, '', 9300, 'Aalst', 'België'],
  ['Nele', 'Dubois', 'Rue de la Station', 8, '', 7500, 'Tournai', 'België'],
  ['Pieter', 'Bakker', 'Prinsengracht', 263, '', '1016 GV', 'Amsterdam', 'Nederland'],
  ['Lotte', 'Verstraete', 'Kortrijksesteenweg', 1040, '', 9051, 'Sint-Denijs-Westrem', 'België'],
  ['Ruben', 'Desmet', 'Wijngaardstraat', 4, '', 9340, 'Lede', 'België'],
  ['Elke', 'Vermeulen', 'Hospitaalstraat', 19, '', 9300, 'Aalst', 'België'],
]

/** Builds the sample list in the shape `parseExcelAddresses` returns. */
export function demoList(): LoadedList {
  return {
    fileName: 'voorbeeldlijst',
    headers: HEADERS,
    rows: ROWS.map((row) => Object.fromEntries(HEADERS.map((header, i) => [header, row[i]]))),
    rowNumbers: ROWS.map((_, i) => i + 2),
  }
}
