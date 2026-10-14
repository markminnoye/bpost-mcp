import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  extractMailingResponseMessages,
  hasFatalMailingResponse,
} from '@/core/masspost/parse-response'
import {
  isRejected,
  NotABpostResponseError,
  parseBpostResponse,
  type MailingResult,
} from '@/core/masspost/parse-response'


const FIXTURE_2RS = path.join(
  process.cwd(),
  'docs/samples/contrapunt/bpost-roundtrip/MID_0100_251614_REFERENCE0_260928215959_2RS.XML',
)

describe('parse MailingResponse (2RS)', () => {
  it('extracts MID-2040 from Contrapunt round-trip fixture', () => {
    const xml = readFileSync(FIXTURE_2RS, 'latin1')
    const messages = extractMailingResponseMessages(xml)
    expect(messages.some((m) => m.code === 'MID-2040' && m.severity === 'FATAL')).toBe(true)
    expect(hasFatalMailingResponse(xml)).toBe(true)
  })
})

const sample = (name: string) => readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip', name), 'latin1')

describe('parseBpostResponse', () => {
  it('reads an acknowledgement (_1AK)', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_261001153940_1AK.XML'))
    expect(r).toEqual({
      kind: 'ack',
      requestFileName: 'MID_0200_251614_REFERENCE0_261001153940_0RQ.XML',
      receivedAt: '2026-10-01T15:41:05',
      messages: [],
    })
    expect(isRejected(r)).toBe(false)
  })

  it('reads a MailingCheck result: request, reference, status, ARR, corrections per seq', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_261001152310_2RS.XML')) as MailingResult
    expect(r).toMatchObject({
      kind: 'check',
      requestFileName: 'MID_0200_251614_REFERENCE0_261001151829_0RQ.XML',
      mailingRef: 'OPTI20261001131829',
      statusCode: '100',
      arr: 100,
    })
    expect(r.items).toHaveLength(5)
    const first = r.items.find((i) => i.seq === 1)!
    expect(first.messages.map((m) => m.code)).toEqual(['MID-4060', '7001'])
    expect(first.suggestions).toEqual([
      { field: 'streetHouseBox', value: 'MOLENBEEKSESTRAAT 184 BUS 35', source: 'OptiAddress' },
    ])
    expect(first.sent).toEqual({ name: 'Anna Vanderstappen', streetHouseBox: 'Molenbeeksestraat 184 35', postcodeCity: '1020 Brussel' })
    expect(isRejected(r)).toBe(false)
  })

  it('reads a MailingCreate result with the Mail ID per seq', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_260929221652_2RS.XML')) as MailingResult
    expect(r).toMatchObject({ kind: 'create', mailingRef: 'MANUAL20260929201329', statusCode: '100', arr: 99.8 })
    expect(r.items.find((i) => i.seq === 1)?.midNum).toBe('90002109818449')
  })

  it('marks a response with a FATAL file message as rejected', () => {
    const r = parseBpostResponse(sample('MID_0100_251614_REFERENCE0_260928215959_2RS.XML'))
    expect(r.messages.some((m) => m.code === 'MID-2040' && m.severity === 'FATAL')).toBe(true)
    expect(isRejected(r)).toBe(true)
  })

  // Synthetic: no live MID-4010/4020 response yet (design 13/10, part 5). Shape from the XSD
  // (Suggestions/Suggestion/Comps) and the live 7001 messages.
  const SYNTHETIC = `<?xml version='1.0' encoding='ISO-8859-1'?><MailingResponse><Context requestName="MailingResponse" dataset="M037_MID" sender="MID" receiver="251614" version="0200"/><Header customerId="251614"><Files><RequestProps fileName="MID_0200_251614_REFERENCE0_261013140500_0RQ.XML" customerFileRef="REFERENCE0"/></Files></Header><MailingCheck seq="1" mailingRef="CP-2026-15-C1"><Status code="100"/><Replies><Reply seq="1"><XPath>/MailingRequest/MailingCheck[@seq="1"]</XPath><Messages><Message code="MID-4040" severity="INFO"><MessageContents><MessageContent key="compliancyRateAtBuildingLevel" value="93.40%"/></MessageContents></Message></Messages></Reply><Reply seq="2"><Locations><Location tagName="Item" attributeName="seq" attributeValue="58"/></Locations><Messages><Message code="MID-4010" severity="ERROR"/></Messages><RequestItem seq="58" lang="fr" priority="NP"><Comps><Comp code="90" value="Luc Dubois"/><Comp code="92" value="Rue de Liège 4"/><Comp code="93" value="4000 Liège"/></Comps></RequestItem></Reply><Reply seq="3"><Locations><Location tagName="Item" attributeName="seq" attributeValue="412"/></Locations><Messages><Message code="MID-4020" severity="ERROR"/></Messages><Suggestions><Suggestion><Comps><Comp code="92" value="KERKSTRAAT 1"/><Comp code="93" value="9300 AALST"/></Comps></Suggestion><Suggestion><Comps><Comp code="92" value="KERKSTRAAT 1"/><Comp code="93" value="9310 MOORSEL"/></Comps></Suggestion></Suggestions></Reply></Replies></MailingCheck></MailingResponse>`

  it('reads unknown addresses, multiple matches with their candidates, and Latin-1 text', () => {
    const r = parseBpostResponse(SYNTHETIC) as MailingResult
    expect(r.arr).toBe(93.4)
    expect(r.items.find((i) => i.seq === 58)).toMatchObject({ messages: [{ code: 'MID-4010', severity: 'ERROR', contents: {} }], sent: { streetHouseBox: 'Rue de Liège 4', postcodeCity: '4000 Liège' } })
    expect(r.items.find((i) => i.seq === 412)?.candidates).toEqual([
      { streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9300 AALST' },
      { streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9310 MOORSEL' },
    ])
  })

  it('refuses a file that is not a bpost response', () => {
    expect(() => parseBpostResponse('<MailingRequest/>')).toThrow(NotABpostResponseError)
    expect(() => parseBpostResponse('geen xml')).toThrow(NotABpostResponseError)
  })
})
