// scripts/build-compare-200.ts
//
// First 200 rows of docs/samples/contrapunt/testadressen.xlsx, twice:
//   testadressen-200.xlsx      Contrapunt columns → npm run generate:mailing-xml -- --file …
//   testadressen-200-aft.xls   Address File Tool (BIFF8). Portal rejects .xlsx.
//
// Unstructured columns use the same join as the XML Comp 90/92/93 mapping.
// No pad to 500: mode=T treats at most 200 addresses, so AFT and XML stay the same set.
//
//   npx tsx scripts/build-compare-200.ts
// Requires Python xlwt for the .xls (pip install xlwt). Set AFT_PYTHON to that interpreter.
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { parseExcelAddresses } from '../src/core/masspost/excel'
import { mapRows } from '../src/core/masspost/mapping'
import {
  COMPARE_SAMPLE_SIZE,
  CONTRAPUNT_AFT_200_XLS,
  CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_200_XLSX,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import { writeXlsxFile } from '../src/core/masspost/fixtures/xlsx'
import { AFT_TEMPLATE_COLUMNS } from '../src/core/masspost/presets/aft'

/** Column titles from docs/internal/e-masspost/docs/resources/template.xls — order is fixed. */
const AFT_COLUMNS = AFT_TEMPLATE_COLUMNS

const WRITE_XLS = `
import json, sys, xlwt
payload = json.load(sys.stdin)
columns = payload["columns"]
rows = payload["rows"]
out_path = payload["out"]
wb = xlwt.Workbook(encoding="latin1")
ws = wb.add_sheet("Sheet0")
for col, name in enumerate(columns):
    ws.write(0, col, name)
for row_idx, row in enumerate(rows, start=1):
    for col, name in enumerate(columns):
        value = row.get(name, "")
        if name == "SEQ":
            ws.write(row_idx, col, int(value))
        elif value != "":
            ws.write(row_idx, col, value)
wb.save(out_path)
print(f"rows={len(rows)} cols={len(columns)}")
`

async function writeCrmXlsx(headers: string[], rows: Record<string, unknown>[]): Promise<void> {
  await writeXlsxFile(CONTRAPUNT_TEST_ADRESSEN_200_XLSX, [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ])
}

function writeAftXls(rows: Record<string, string | number>[]): void {
  const python = process.env.AFT_PYTHON ?? 'python3'
  const result = spawnSync(python, ['-c', WRITE_XLS], {
    input: JSON.stringify({
      columns: AFT_COLUMNS,
      rows,
      out: CONTRAPUNT_AFT_200_XLS,
    }),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(
      `Kon ${CONTRAPUNT_AFT_200_XLS} niet schrijven met ${python}. ` +
        `Installeer xlwt (pip install xlwt) of zet AFT_PYTHON op een interpreter die xlwt heeft.\n${detail}`,
    )
  }
  process.stdout.write(result.stdout)
}

async function main() {
  const parsed = await parseExcelAddresses(await readFile(CONTRAPUNT_TEST_ADRESSEN_XLSX))
  if (parsed.rows.length < COMPARE_SAMPLE_SIZE) {
    throw new Error(`Bron heeft ${parsed.rows.length} rijen, nodig: ${COMPARE_SAMPLE_SIZE}`)
  }

  const sourceRows = parsed.rows.slice(0, COMPARE_SAMPLE_SIZE)
  const mapped = mapRows(sourceRows, CONTRAPUNT_SAMPLE_COLUMN_MAPPING)
  const blocked = mapped.warnings.filter((warning) => warning.message.includes('niet aanvaardt'))
  if (blocked.length > 0) {
    throw new Error(`Tekens die bpost weigert in de eerste ${COMPARE_SAMPLE_SIZE} rijen:\n${blocked.map((w) => w.message).join('\n')}`)
  }

  await writeCrmXlsx(parsed.headers, sourceRows)

  const aftRows = mapped.rows.map((row) => {
    const record: Record<string, string | number> = {}
    for (const column of AFT_COLUMNS) record[column] = ''
    record.SEQ = row.seq
    record.UNSTRUCTURED_NAME = row.fields.name.value
    record.UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX = row.fields.streetHouseBox.value
    record.UNSTRUCTURED_POST_CODE_CITY = row.fields.postcodeCity.value
    record.PRIORITY = 'NP'
    return record
  })
  writeAftXls(aftRows)

  console.log(`CRM:  ${CONTRAPUNT_TEST_ADRESSEN_200_XLSX} (${sourceRows.length} rijen)`)
  console.log(`AFT:  ${CONTRAPUNT_AFT_200_XLS} (${aftRows.length} rijen, PRIORITY=NP, unstructured 90/92/93)`)
  if (mapped.warnings.length > 0) {
    console.log(`Waarschuwingen bij mapping: ${mapped.warnings.length}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
