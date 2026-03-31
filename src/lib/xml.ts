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

export function buildXml(obj: Record<string, unknown>): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n${xmlBuilder.build(obj)}`
}
