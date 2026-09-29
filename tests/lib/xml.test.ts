import { describe, it, expect } from 'vitest'
import { buildXml, parseXml } from '@/lib/xml'

// Regression coverage for a structural bug found 28/09/2026: buildXml previously rendered every
// scalar field as a child element instead of an XML attribute, contradicting the MailingRequest
// and DepositRequest XSDs (which model virtually every scalar leaf as an xs:attribute). This went
// unnoticed because submit-batch.test.ts / check-batch.test.ts mock buildXml entirely. These tests
// exercise the real XMLBuilder.
describe('buildXml — attribute shaping', () => {
  it('renders scalar Context/Header fields as XML attributes, not child elements', () => {
    const xml = buildXml({
      MailingRequest: {
        Context: {
          requestName: 'MailingRequest',
          dataset: 'M037_MID',
          sender: 123456,
          receiver: 'MID',
          version: '0200',
        },
        Header: {
          customerId: 123456,
          accountId: 789,
          mode: 'T',
        },
      },
    })

    expect(xml).toContain(
      '<Context requestName="MailingRequest" dataset="M037_MID" sender="123456" receiver="MID" version="0200">',
    )
    expect(xml).toContain('<Header customerId="123456" accountId="789" mode="T">')
    // The old (buggy) shape would have produced this — make sure it's gone.
    expect(xml).not.toContain('<requestName>')
    expect(xml).not.toContain('<mode>')
  })

  it('renders Comp code/value as attributes on the Comp element (per CompsType XSD)', () => {
    const xml = buildXml({
      Item: { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '90', value: 'Jan Janssens' }] } },
    })

    expect(xml).toContain('<Item seq="1" priority="NP">')
    expect(xml).toContain('<Comp code="90" value="Jan Janssens">')
    expect(xml).not.toContain('<code>90</code>')
    expect(xml).not.toContain('<value>Jan Janssens</value>')
  })

  it('renders repeated Comp elements for an array, each with its own attributes', () => {
    const xml = buildXml({
      Comps: { Comp: [{ code: '90', value: 'A' }, { code: '92', value: 'B' }] },
    })

    expect(xml).toContain('<Comp code="90" value="A">')
    expect(xml).toContain('<Comp code="92" value="B">')
  })

  it('renders Format.value as element text content, not an attribute (xs:simpleContent exception)', () => {
    const withoutSorting = buildXml({ Format: { value: 'Large' } })
    expect(withoutSorting).toContain('<Format>Large</Format>')
    expect(withoutSorting).not.toContain('value="Large"')

    const withSorting = buildXml({ Format: { value: 'Small', responseSortingMode: 'PO' } })
    expect(withSorting).toContain('<Format responseSortingMode="PO">Small</Format>')
  })

  it('omits undefined optional fields entirely rather than rendering empty attributes', () => {
    const xml = buildXml({ Header: { customerId: 1, accountId: 2, mode: 'T', extra: undefined } })
    expect(xml).not.toContain('extra')
  })

  it('round-trips through parseXml for a value-only element like ItemCount', () => {
    const xml = buildXml({ ItemCount: { value: 5 } })
    expect(xml).toContain('<ItemCount value="5">')

    const parsed = parseXml<{ ItemCount: { '@_value': string } }>(xml)
    expect(parsed.ItemCount['@_value']).toBe('5')
  })
})
