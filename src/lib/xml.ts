import { XMLBuilder, XMLParser } from 'fast-xml-parser'

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: false, // keep attribute strings as-is per BPost spec
  parseTagValue: false,       // keep tag text content as strings (prevents numeric coercion)
}

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: false,
}

export const xmlParser = new XMLParser(PARSER_OPTIONS)
export const xmlBuilder = new XMLBuilder(BUILDER_OPTIONS)

export function parseXml<T>(xml: string): T {
  return xmlParser.parse(xml) as T
}

/**
 * Converts a plain object tree (as produced by our Zod schemas in src/schemas/) into the shape
 * fast-xml-parser's XMLBuilder needs: attribute keys prefixed with "@_", element keys bare.
 *
 * bpost's MailingRequest/DepositRequest XSDs consistently model every scalar leaf field as an
 * XML *attribute*, and every nested object or array-of-objects as a child *element* — confirmed
 * across Context, Header, Item, Comps/Comp, ItemCount, PresortingCodeVersion, RequestProps,
 * ResponseProps, CustomerRef, and every MailingCheck/DepositCreate/etc. attribute group in both
 * XSDs. The one documented exception in either XSD is `<Format>` in MailingRequest.xsd
 * (`xs:simpleContent`): its `value` is the element's own text content, not an attribute — e.g.
 * `<Format responseSortingMode="PO">Large</Format>`. That is special-cased below.
 *
 * Our Zod schemas were written with clean (non-prefixed) property names for ergonomics, so
 * `buildXml` applies this conversion automatically — schema authors never need to think about
 * "@_"-prefixing, and every caller gets structurally correct XML for free.
 */
function toXmlAttrShape(value: unknown, elementName?: string): unknown {
  if (value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map((item) => toXmlAttrShape(item, elementName))
  }

  if (typeof value !== 'object') {
    return value
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue

    // xs:simpleContent exception: Format's "value" is element text, not an attribute.
    if (elementName === 'Format' && key === 'value' && typeof val === 'string') {
      result['#text'] = val
      continue
    }

    if (val !== null && typeof val === 'object') {
      result[key] = toXmlAttrShape(val, key)
    } else {
      result[`@_${key}`] = val
    }
  }
  return result
}

export function buildXml(obj: Record<string, unknown>): string {
  const attrShaped = toXmlAttrShape(obj) as Record<string, unknown>
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n${xmlBuilder.build(attrShaped)}`
}
