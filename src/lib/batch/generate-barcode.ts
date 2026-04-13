const FCC = '12' // Customer-generated, 11-digit mail piece number

/**
 * Generates an 18-digit Mail ID number for one row in a batch.
 *
 * Structure: FCC (2) + barcodeCustomerId (5) + weekNumber (2) + batchSequence (3) + rowIndex (6)
 *
 * Pure function — no DB access or side effects.
 */
export function generateMidNumber(
  barcodeCustomerId: string,
  weekNumber: number,
  batchSequence: number,
  rowIndex: number,
): string {
  if (!/^\d{5}$/.test(barcodeCustomerId)) {
    throw new Error('barcodeCustomerId must be exactly 5 digits')
  }
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error('weekNumber must be 1–53')
  }
  if (batchSequence < 0 || batchSequence > 999) {
    throw new Error('batchSequence must be 0–999')
  }
  if (rowIndex < 0 || rowIndex > 999999) {
    throw new Error('rowIndex must be 0–999999')
  }

  const ww = String(weekNumber).padStart(2, '0')
  const bbb = String(batchSequence).padStart(3, '0')
  const nnnnnn = String(rowIndex).padStart(6, '0')

  return `${FCC}${barcodeCustomerId}${ww}${bbb}${nnnnnn}`
}