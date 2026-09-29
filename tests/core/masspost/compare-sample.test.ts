import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseExcelAddresses } from '@/core/masspost/excel'
import { mapRows } from '@/core/masspost/mapping'
import {
  COMPARE_SAMPLE_SIZE,
  CONTRAPUNT_EXPORT_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_200_XLSX,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '@/core/masspost/fixtures/contrapunt-sample'

describe('AFT vs XML compare sample (200)', () => {
  it('is the first 200 rows of testadressen.xlsx, mapped like the mailing XML', async () => {
    const full = await parseExcelAddresses(await readFile(CONTRAPUNT_TEST_ADRESSEN_XLSX))
    const subset = await parseExcelAddresses(await readFile(CONTRAPUNT_TEST_ADRESSEN_200_XLSX))

    expect(subset.rows).toHaveLength(COMPARE_SAMPLE_SIZE)
    expect(subset.headers).toEqual(full.headers)
    expect(subset.rows[0]).toEqual(full.rows[0])
    expect(subset.rows[COMPARE_SAMPLE_SIZE - 1]).toEqual(full.rows[COMPARE_SAMPLE_SIZE - 1])

    const mapped = mapRows(subset.rows, CONTRAPUNT_EXPORT_COLUMN_MAPPING)
    expect(mapped.rows[0]?.fields.name.value).toBe('Anna Vanderstappen')
    expect(mapped.rows[0]?.fields.streetHouseBox.value).toBe('Molenbeeksestraat 184 35')
    expect(mapped.rows[0]?.fields.postcodeCity.value).toBe('1020 Brussel')
    expect(mapped.warnings.filter((warning) => warning.message.includes('niet aanvaardt'))).toEqual([])
  })
})
