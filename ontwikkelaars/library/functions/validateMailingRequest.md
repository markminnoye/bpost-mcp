[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / validateMailingRequest

# Function: validateMailingRequest()

> **validateMailingRequest**(`candidate`, `midVersion?`): [`ValidationResult`](../interfaces/ValidationResult.md)

Validates a candidate MailingRequest object against the same Zod schema (XSD-derived
 field lengths, patterns, enums) used to build outgoing requests elsewhere in this repo.

## Parameters

### candidate

`unknown`

Object from the build functions, or any unknown payload.

### midVersion?

[`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md) = `'0100'`

Protocol version passed to `mailingRequestSchemaForVersion`. Default `0100`.

## Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

`valid: true` and the parsed request, or `valid: false` and the issues. Does not throw.

## Example

```ts
const result = validateMailingRequest(request, '0200')
if (!result.valid) console.log(result.issues)
```
