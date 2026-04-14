export interface ToolRegistryParameter {
  name: string
  type: string
  required: boolean
  description?: string
  source: string
}

export interface ToolRegistryTool {
  name: string
  description?: string
  annotations?: Record<string, boolean>
  parameters: ToolRegistryParameter[]
  rawSchema: { source: string; kind: string }
}

export interface ToolRegistryResource {
  name: string
  description?: string
  uri?: string
  mimeType?: string
  metadata: Record<string, string | boolean | number | null>
}

export interface ToolRegistryPromptArgument {
  name: string
  description?: string
  required: boolean
}

export interface ToolRegistryPrompt {
  name: string
  description?: string
  arguments: ToolRegistryPromptArgument[]
  metadata: Record<string, string | boolean | number | null>
}

export interface ToolRegistry {
  generatedAt: string
  serverInfo: {
    name: string
    version: string
    description: string
    iconUrl: string
  }
  instructions: string
  tools: ToolRegistryTool[]
  resources: ToolRegistryResource[]
  prompts: ToolRegistryPrompt[]
}
