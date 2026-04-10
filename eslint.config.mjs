import typescriptConfig from 'eslint-config-next/typescript'
import nextPlugin from '@next/eslint-plugin-next'

export default [
  ...typescriptConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
]
