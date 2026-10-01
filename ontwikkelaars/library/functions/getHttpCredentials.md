[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / getHttpCredentials

# Function: getHttpCredentials()

> **getHttpCredentials**(): [`HttpCredentials`](../interfaces/HttpCredentials.md)

Resolves HTTP (Basic Auth) credentials. Fails fast, but only when actually called.

## Returns

[`HttpCredentials`](../interfaces/HttpCredentials.md)

Credentials from the `BPOST_TEST_*` environment variables.

## Throws

When username, password, customer id, or account id is missing.
