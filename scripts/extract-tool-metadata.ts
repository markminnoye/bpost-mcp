import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import ts from 'typescript'
import type {
  ToolRegistry,
  ToolRegistryParameter,
  ToolRegistryPrompt,
  ToolRegistryResource,
  ToolRegistryTool,
} from '../src/lib/mcp/tool-registry-types'

type RegistryKind = 'tools' | 'resources' | 'prompts'

interface RegisterCall {
  kind: RegistryKind
  args: ts.NodeArray<ts.Expression>
}

const ROOT = process.cwd()
const ROUTE_PATH = path.join(ROOT, 'src/app/api/mcp/route.ts')
const APP_VERSION_PATH = path.join(ROOT, 'src/lib/app-version.ts')
const INSTRUCTIONS_PATH = path.join(ROOT, 'src/lib/mcp/server-instructions.ts')
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json')
const OUTPUT_PATH = path.join(ROOT, 'src/generated/tool-registry.json')

function nodeToText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile).trim()
}

function isStringLiteralLike(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

function evalStringExpression(node: ts.Expression): string | undefined {
  if (isStringLiteralLike(node)) return node.text

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evalStringExpression(node.left)
    const right = evalStringExpression(node.right)
    if (left === undefined || right === undefined) return undefined
    return left + right
  }

  if (ts.isParenthesizedExpression(node)) {
    return evalStringExpression(node.expression)
  }

  return undefined
}

function collectRegisterCalls(sourceFile: ts.SourceFile): RegisterCall[] {
  const calls: RegisterCall[] = []

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      if (method === 'registerTool') calls.push({ kind: 'tools', args: node.arguments })
      if (method === 'registerResource') calls.push({ kind: 'resources', args: node.arguments })
      if (method === 'registerPrompt') calls.push({ kind: 'prompts', args: node.arguments })
    }
    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return calls
}

function parseMetadataObject(node: ts.Expression | undefined, sourceFile: ts.SourceFile): {
  description?: string
  annotations?: Record<string, boolean>
  inputSchema?: ts.Expression
  argsSpec?: ts.Expression
  generic: Record<string, string | boolean | number | null>
} {
  const generic: Record<string, string | boolean | number | null> = {}
  let description: string | undefined
  let annotations: Record<string, boolean> | undefined
  let inputSchema: ts.Expression | undefined
  let argsSpec: ts.Expression | undefined

  if (!node || !ts.isObjectLiteralExpression(node)) {
    return { description, annotations, inputSchema, argsSpec, generic }
  }

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const key = ts.isIdentifier(property.name) ? property.name.text : property.name.getText(sourceFile).replace(/['"]/g, '')
    const value = property.initializer

    if (key === 'description') {
      description = evalStringExpression(value) ?? nodeToText(value, sourceFile)
      continue
    }

    if (key === 'annotations' && ts.isObjectLiteralExpression(value)) {
      const annotationMap: Record<string, boolean> = {}
      for (const ann of value.properties) {
        if (!ts.isPropertyAssignment(ann)) continue
        const annKey = ts.isIdentifier(ann.name) ? ann.name.text : ann.name.getText(sourceFile).replace(/['"]/g, '')
        if (ann.initializer.kind === ts.SyntaxKind.TrueKeyword) annotationMap[annKey] = true
        if (ann.initializer.kind === ts.SyntaxKind.FalseKeyword) annotationMap[annKey] = false
      }
      annotations = annotationMap
      continue
    }

    if (key === 'inputSchema') {
      inputSchema = value
      continue
    }

    if (key === 'arguments') {
      argsSpec = value
      continue
    }

    if (isStringLiteralLike(value)) {
      generic[key] = value.text
      continue
    }
    if (value.kind === ts.SyntaxKind.TrueKeyword) generic[key] = true
    else if (value.kind === ts.SyntaxKind.FalseKeyword) generic[key] = false
    else if (ts.isNumericLiteral(value)) generic[key] = Number(value.text)
    else if (value.kind === ts.SyntaxKind.NullKeyword) generic[key] = null
  }

  return { description, annotations, inputSchema, argsSpec, generic }
}

function unwrapCallChain(expression: ts.Expression): { root: ts.Expression; chain: ts.CallExpression[] } {
  const chain: ts.CallExpression[] = []
  let current: ts.Expression = expression

  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    chain.push(current)
    current = current.expression.expression
  }

  return { root: current, chain }
}

function inferZodType(expression: ts.Expression, sourceFile: ts.SourceFile): string {
  const text = nodeToText(expression, sourceFile)
  const coerceMatch = text.match(/\bz\s*\.\s*coerce\s*\.\s*(string|number|boolean|date)\b/)
  if (coerceMatch?.[1]) return coerceMatch[1]
  const directMatch = text.match(/\bz\s*\.\s*(string|number|boolean|array|record|enum|object|any)\b/)
  if (directMatch?.[1]) return directMatch[1]

  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
    const owner = expression.expression.expression.getText(sourceFile)
    const method = expression.expression.name.text
    if (owner === 'z') return method
  }
  return 'unknown'
}

function parseParameter(name: string, expression: ts.Expression, sourceFile: ts.SourceFile): ToolRegistryParameter {
  const { chain } = unwrapCallChain(expression)
  const required = !chain.some((call) => {
    if (!ts.isPropertyAccessExpression(call.expression)) return false
    const method = call.expression.name.text
    return method === 'optional' || method === 'default'
  })

  let description: string | undefined
  for (const call of chain) {
    if (!ts.isPropertyAccessExpression(call.expression)) continue
    if (call.expression.name.text !== 'describe') continue
    const arg = call.arguments[0]
    if (arg && isStringLiteralLike(arg)) {
      description = arg.text
      break
    }
  }

  return {
    name,
    type: inferZodType(expression, sourceFile),
    required,
    description,
    source: nodeToText(expression, sourceFile),
  }
}

function findZObjectCall(expression: ts.Expression): ts.CallExpression | undefined {
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
    const owner = expression.expression.expression
    const method = expression.expression.name.text
    if (owner.getText() === 'z' && method === 'object') return expression
    return findZObjectCall(owner)
  }

  if (ts.isParenthesizedExpression(expression)) {
    return findZObjectCall(expression.expression)
  }

  return undefined
}

function extractParameters(inputSchema: ts.Expression | undefined, sourceFile: ts.SourceFile): {
  parameters: ToolRegistryParameter[]
  rawSchema: { source: string; kind: string }
} {
  if (!inputSchema) {
    return { parameters: [], rawSchema: { source: '', kind: 'none' } }
  }

  const schemaSource = nodeToText(inputSchema, sourceFile)
  const zObjectCall = findZObjectCall(inputSchema)
  if (!zObjectCall) {
    return { parameters: [], rawSchema: { source: schemaSource, kind: 'external' } }
  }

  const shapeArg = zObjectCall.arguments[0]
  if (!shapeArg || !ts.isObjectLiteralExpression(shapeArg)) {
    return { parameters: [], rawSchema: { source: schemaSource, kind: 'z.object-unparsed' } }
  }

  const parameters: ToolRegistryParameter[] = []
  for (const property of shapeArg.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const key = ts.isIdentifier(property.name) ? property.name.text : property.name.getText(sourceFile).replace(/['"]/g, '')
    parameters.push(parseParameter(key, property.initializer, sourceFile))
  }

  return { parameters, rawSchema: { source: schemaSource, kind: 'z.object' } }
}

function parsePromptArguments(argsSpec: ts.Expression | undefined, sourceFile: ts.SourceFile): Array<{ name: string; description?: string; required: boolean }> {
  if (!argsSpec || !ts.isObjectLiteralExpression(argsSpec)) return []
  const args: Array<{ name: string; description?: string; required: boolean }> = []

  for (const property of argsSpec.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = ts.isIdentifier(property.name) ? property.name.text : property.name.getText(sourceFile).replace(/['"]/g, '')
    if (!ts.isObjectLiteralExpression(property.initializer)) {
      args.push({ name, required: true })
      continue
    }
    let description: string | undefined
    let required = true
    for (const field of property.initializer.properties) {
      if (!ts.isPropertyAssignment(field)) continue
      const key = ts.isIdentifier(field.name) ? field.name.text : field.name.getText(sourceFile).replace(/['"]/g, '')
      if (key === 'description' && isStringLiteralLike(field.initializer)) description = field.initializer.text
      if (key === 'required' && field.initializer.kind === ts.SyntaxKind.FalseKeyword) required = false
    }
    args.push({ name, description, required })
  }

  return args
}

function extractTools(routeSource: string): ToolRegistryTool[] {
  const sourceFile = ts.createSourceFile('route.ts', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const calls = collectRegisterCalls(sourceFile).filter((call) => call.kind === 'tools')
  const tools: ToolRegistryTool[] = []

  for (const call of calls) {
    const [nameNode, metadataNode] = call.args
    if (!nameNode || !isStringLiteralLike(nameNode)) continue

    const metadata = parseMetadataObject(metadataNode, sourceFile)
    const schema = extractParameters(metadata.inputSchema, sourceFile)
    tools.push({
      name: nameNode.text,
      description: metadata.description,
      annotations: metadata.annotations,
      parameters: schema.parameters,
      rawSchema: schema.rawSchema,
    })
  }

  return tools
}

function extractResources(routeSource: string): ToolRegistryResource[] {
  const sourceFile = ts.createSourceFile('route.ts', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const calls = collectRegisterCalls(sourceFile).filter((call) => call.kind === 'resources')
  const resources: ToolRegistryResource[] = []

  for (const call of calls) {
    const [nameNode, metadataNode] = call.args
    if (!nameNode || !isStringLiteralLike(nameNode)) continue
    const metadata = parseMetadataObject(metadataNode, sourceFile)
    resources.push({
      name: nameNode.text,
      description: metadata.description,
      uri: typeof metadata.generic.uri === 'string' ? metadata.generic.uri : undefined,
      mimeType: typeof metadata.generic.mimeType === 'string' ? metadata.generic.mimeType : undefined,
      metadata: metadata.generic,
    })
  }

  return resources
}

function extractPrompts(routeSource: string): ToolRegistryPrompt[] {
  const sourceFile = ts.createSourceFile('route.ts', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const calls = collectRegisterCalls(sourceFile).filter((call) => call.kind === 'prompts')
  const prompts: ToolRegistryPrompt[] = []

  for (const call of calls) {
    const [nameNode, metadataNode] = call.args
    if (!nameNode || !isStringLiteralLike(nameNode)) continue
    const metadata = parseMetadataObject(metadataNode, sourceFile)
    prompts.push({
      name: nameNode.text,
      description: metadata.description,
      arguments: parsePromptArguments(metadata.argsSpec, sourceFile),
      metadata: metadata.generic,
    })
  }

  return prompts
}

function extractInstructions(source: string): string {
  const match = source.match(/export const MCP_SERVER_INSTRUCTIONS\s*=\s*`([\s\S]*?)`\s*\.trim\(\)/)
  if (match?.[1]) return match[1].trim()
  const fallback = source.match(/export const MCP_SERVER_INSTRUCTIONS\s*=\s*`([\s\S]*?)`/)
  return fallback?.[1]?.trim() ?? ''
}

function extractConstString(source: string, constName: string): string {
  const regex = new RegExp(`export const ${constName}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`)
  return source.match(regex)?.[2]?.trim() ?? ''
}

function extractIconUrl(source: string): string {
  const svgMatch = source.match(/const svgIcon = `([\s\S]*?)`\s*export const MCP_SERVER_ICON_URL/)
  if (!svgMatch?.[1]) return ''
  return `data:image/svg+xml;base64,${Buffer.from(svgMatch[1]).toString('base64')}`
}

async function readServerInfo(): Promise<ToolRegistry['serverInfo']> {
  const [appVersionSource, packageSource] = await Promise.all([
    readFile(APP_VERSION_PATH, 'utf8'),
    readFile(PACKAGE_JSON_PATH, 'utf8'),
  ])
  const packageJson = JSON.parse(packageSource) as { version?: string }

  return {
    name: extractConstString(appVersionSource, 'MCP_SERVER_DISPLAY_NAME'),
    version: packageJson.version ?? '',
    description: extractConstString(appVersionSource, 'MCP_SERVER_DESCRIPTION'),
    iconUrl: extractIconUrl(appVersionSource),
  }
}

export async function buildRegistry(): Promise<ToolRegistry> {
  const [routeSource, instructionsSource, serverInfo] = await Promise.all([
    readFile(ROUTE_PATH, 'utf8'),
    readFile(INSTRUCTIONS_PATH, 'utf8'),
    readServerInfo(),
  ])

  return {
    generatedAt: new Date().toISOString(),
    serverInfo,
    instructions: extractInstructions(instructionsSource),
    tools: extractTools(routeSource),
    resources: extractResources(routeSource),
    prompts: extractPrompts(routeSource),
  }
}

async function main() {
  const registry = await buildRegistry()
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH} with ${registry.tools.length} tools, ${registry.resources.length} resources, ${registry.prompts.length} prompts.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
