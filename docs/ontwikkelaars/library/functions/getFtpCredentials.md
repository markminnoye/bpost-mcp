[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / getFtpCredentials

# Function: getFtpCredentials()

> **getFtpCredentials**(): [`FtpCredentials`](../interfaces/FtpCredentials.md)

Resolves FTP(S) credentials. Falls back to the HTTP login when no FTP-specific login is set.

## Returns

[`FtpCredentials`](../interfaces/FtpCredentials.md)

Host, user, password, and whether to use TLS.

## Throws

When no username or password is available.
