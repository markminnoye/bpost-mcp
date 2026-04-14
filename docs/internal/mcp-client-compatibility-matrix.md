# MCP Client Compatibility Matrix

## Purpose

Track which `initialize.serverInfo` shape is safe across supported MCP clients, and define production defaults.

## Production Default (current)

- `serverInfo.name`: enabled
- `serverInfo.version`: enabled
- `serverInfo.title`: disabled by default (`MCP_SERVERINFO_ENABLE_TITLE=false`)
- `serverInfo.description`: disabled by default (`MCP_SERVERINFO_ENABLE_DESCRIPTION=false`)
- `serverInfo.websiteUrl`: disabled by default (`MCP_SERVERINFO_ENABLE_WEBSITE_URL=false`)
- `serverInfo.icons`: disabled by default (`MCP_SERVERINFO_ENABLE_ICONS=false`)

## Rollout Flags

- `MCP_SERVERINFO_ENABLE_TITLE`
- `MCP_SERVERINFO_ENABLE_DESCRIPTION`
- `MCP_SERVERINFO_ENABLE_WEBSITE_URL`
- `MCP_SERVERINFO_ENABLE_ICONS`

Use preview deployments to enable one flag group at a time and validate clients before promoting to production defaults.

## Validation Matrix


| Client         | name+version | +title    | +description | +websiteUrl | +icons    | Notes                                       |
| -------------- | ------------ | --------- | ------------ | ----------- | --------- | ------------------------------------------- |
| Claude Desktop | ✅ baseline   | ⏳ pending | ⏳ pending    | ⏳ pending   | ⏳ pending | Validate connect + tool call + reconnect    |
| Le Chat        | ✅ baseline   | ⏳ pending | ⏳ pending    | ⏳ pending   | ⏳ pending | Historically sensitive to optional metadata |


## Validation Checklist per step

1. Connect/auth succeeds without generic authorization error.
2. `initialize` response contains expected fields only.
3. `tools/list` and one representative `tools/call` succeed.
4. Reconnect after token refresh still succeeds.
5. No client-side parsing errors in logs/UI.